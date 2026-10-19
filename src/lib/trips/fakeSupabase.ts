import { vi } from "vitest";

// Minimal chainable stand-in for the Supabase client, for tests only. Each
// table resolves to its configured `{ data, error }`, or with a list of
// results, the n-th query of that table to the n-th entry; calls are recorded.
type Result = { data: unknown; error: unknown; count?: number | null };
type Write = (row: unknown, options?: unknown) => Promise<{ error: unknown }>;

function makeBuilder(result: Result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    overrideTypes: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    upsert: vi.fn<Write>(async () => ({ error: result.error })),
    insert: vi.fn<Write>(async () => ({ error: result.error })),
    update: vi.fn<(row: unknown) => unknown>(),
    delete: vi.fn<() => unknown>(),
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  // Chainable like PostgREST (`.update(row).eq(...)`); awaiting resolves the
  // table's result, whose `error` the write reports.
  builder.update.mockImplementation(() => builder);
  builder.delete.mockImplementation(() => builder);
  return builder;
}

export function fakeSupabase({
  user = { id: "user-1" } as { id: string } | null,
  tables = {} as Record<string, Result | Result[]>,
} = {}) {
  const builders: { table: string; builder: ReturnType<typeof makeBuilder> }[] =
    [];
  const from = vi.fn((table: string) => {
    const configured = tables[table];
    const calls = builders.filter((entry) => entry.table === table).length;
    const builder = makeBuilder(
      (Array.isArray(configured) ? configured[calls] : configured) ?? {
        data: null,
        error: null,
      },
    );
    builders.push({ table, builder });
    return builder;
  });
  return {
    client: { auth: { getUser: async () => ({ data: { user } }) }, from },
    from,
    builders,
  };
}
