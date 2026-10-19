import { vi } from "vitest";

// Minimal chainable stand-in for the Supabase client, for tests only. Each
// table resolves to its configured `{ data, error }`; calls are recorded.
type Result = { data: unknown; error: unknown };
type Write = (row: unknown, options?: unknown) => Promise<{ error: unknown }>;

function makeBuilder(result: Result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    overrideTypes: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    upsert: vi.fn<Write>(async () => ({ error: result.error })),
    insert: vi.fn<Write>(async () => ({ error: result.error })),
    update: vi.fn<Write>(async () => ({ error: result.error })),
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  return builder;
}

export function fakeSupabase({
  user = { id: "user-1" } as { id: string } | null,
  tables = {} as Record<string, Result>,
} = {}) {
  const builders: { table: string; builder: ReturnType<typeof makeBuilder> }[] =
    [];
  const from = vi.fn((table: string) => {
    const builder = makeBuilder(tables[table] ?? { data: null, error: null });
    builders.push({ table, builder });
    return builder;
  });
  return {
    client: { auth: { getUser: async () => ({ data: { user } }) }, from },
    from,
    builders,
  };
}
