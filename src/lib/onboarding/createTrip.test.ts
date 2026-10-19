import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOnboardingTrip,
  findLatestTripId,
  passportStepId,
} from "./createTrip";
import type { OnboardingInput } from "./validate";

type Result = { data?: unknown; error?: unknown };
type Call = {
  table: string;
  op: "select" | "insert" | "delete";
  payload?: unknown;
  filters: [string, unknown][];
};

// Records every query and answers it from `results[`${table}.${op}`]`.
function fakeSupabase(overrides: Record<string, Result> = {}) {
  const results: Record<string, Result> = {
    "trips.insert": { data: { id: "trip-1" }, error: null },
    "travelers.insert": {
      data: [{ id: "traveler-1" }, { id: "traveler-2" }],
      error: null,
    },
    "trip_step_progress.insert": { data: null, error: null },
    "trips.delete": { data: null, error: null },
    ...overrides,
  };
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, op: "select", filters: [] };
      calls.push(call);
      const builder = {
        insert(payload: unknown) {
          call.op = "insert";
          call.payload = payload;
          return builder;
        },
        delete() {
          call.op = "delete";
          return builder;
        },
        eq(column: string, value: unknown) {
          call.filters.push([column, value]);
          return builder;
        },
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        single: () => builder,
        then(
          resolve: (value: Result) => unknown,
          reject: (reason: unknown) => unknown,
        ) {
          const result = results[`${table}.${call.op}`] ?? {
            data: null,
            error: null,
          };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const secretName = "Siti Aminah Rahasia";
const secretNotes = "Memakai kursi roda";

const input = (overrides: Partial<OnboardingInput> = {}): OnboardingInput => ({
  city: "Surabaya",
  year: 2027,
  month: 3,
  passport: "valid",
  travelers: [
    { name: secretName, isMinor: false, hasDisability: true },
    { name: "Budi", isMinor: true, hasDisability: false },
  ],
  disabilityNotes: secretNotes,
  ...overrides,
});

const now = new Date("2026-10-19T08:00:00.000Z");

const find = (calls: Call[], table: string, op: Call["op"]) =>
  calls.filter((call) => call.table === table && call.op === op);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createOnboardingTrip", () => {
  it("inserts the trip with flags, date and notes but no user_id", async () => {
    const { client, calls } = fakeSupabase();
    const result = await createOnboardingTrip(
      client,
      input(),
      "Umrah Maret 2027",
      now,
    );

    expect(result).toEqual({ ok: true, tripId: "trip-1" });
    const [trip] = find(calls, "trips", "insert");
    expect(trip.payload).toEqual({
      name: "Umrah Maret 2027",
      departure_city: "Surabaya",
      planned_departure_date: "2027-03-01",
      has_disabilities: true,
      has_minors: true,
      disability_notes: secretNotes,
    });
    expect(trip.payload).not.toHaveProperty("user_id");
  });

  it("stores false flags and null notes when nobody needs them", async () => {
    const { client, calls } = fakeSupabase();
    await createOnboardingTrip(
      client,
      input({
        month: 11,
        travelers: [{ name: "Budi", isMinor: false, hasDisability: false }],
        disabilityNotes: null,
      }),
      "Umrah November 2027",
      now,
    );
    expect(find(calls, "trips", "insert")[0].payload).toMatchObject({
      planned_departure_date: "2027-11-01",
      has_disabilities: false,
      has_minors: false,
      disability_notes: null,
    });
  });

  it("inserts all travelers in one call with the new trip_id", async () => {
    const { client, calls } = fakeSupabase();
    await createOnboardingTrip(client, input(), "Umrah Maret 2027", now);

    const inserts = find(calls, "travelers", "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].payload).toEqual([
      {
        trip_id: "trip-1",
        name: secretName,
        is_minor: false,
        has_disability: true,
      },
      { trip_id: "trip-1", name: "Budi", is_minor: true, has_disability: false },
    ]);
  });

  it("marks step 01 completed per traveler when the passport is valid", async () => {
    const { client, calls } = fakeSupabase();
    await createOnboardingTrip(client, input(), "Umrah Maret 2027", now);

    const progress = find(calls, "trip_step_progress", "insert");
    expect(progress).toHaveLength(1);
    expect(progress[0].payload).toEqual(
      ["traveler-1", "traveler-2"].map((travelerId) => ({
        trip_id: "trip-1",
        step_id: passportStepId,
        traveler_id: travelerId,
        status: "completed",
        completed_at: "2026-10-19T08:00:00.000Z",
      })),
    );
    expect(passportStepId).toBe("5eed0000-0000-4000-8000-000000000001");
  });

  it.each(["expired", "none"] as const)(
    "inserts no progress rows when the passport is %s",
    async (passport) => {
      const { client, calls } = fakeSupabase();
      const result = await createOnboardingTrip(
        client,
        input({ passport }),
        "Umrah Maret 2027",
        now,
      );
      expect(result).toEqual({ ok: true, tripId: "trip-1" });
      expect(find(calls, "trip_step_progress", "insert")).toHaveLength(0);
    },
  );

  it("never creates trip_step_config rows", async () => {
    const { client, calls } = fakeSupabase();
    await createOnboardingTrip(client, input(), "Umrah Maret 2027", now);
    expect(calls.some((call) => call.table === "trip_step_config")).toBe(false);
  });

  it("returns the generic error without later writes when the trip insert fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, calls } = fakeSupabase({
      "trips.insert": {
        data: null,
        error: { code: "42501", message: `row ${secretName}`, details: "x" },
      },
    });
    const result = await createOnboardingTrip(client, input(), "n", now);

    expect(result).toEqual({ ok: false, error: "create_failed" });
    expect(calls.map((call) => call.table)).toEqual(["trips"]);
    expect(JSON.stringify(log.mock.calls)).not.toContain(secretName);
  });

  it("deletes the trip and returns the generic error when the travelers insert fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, calls } = fakeSupabase({
      "travelers.insert": {
        data: null,
        error: {
          code: "23514",
          message: `Failing row contains (${secretName}, ${secretNotes})`,
          details: secretName,
          hint: secretNotes,
        },
      },
    });
    const result = await createOnboardingTrip(client, input(), "n", now);

    expect(result).toEqual({ ok: false, error: "create_failed" });
    const deletes = find(calls, "trips", "delete");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].filters).toEqual([["id", "trip-1"]]);
    expect(find(calls, "trip_step_progress", "insert")).toHaveLength(0);

    const output = JSON.stringify([result, log.mock.calls]);
    expect(output).not.toContain(secretName);
    expect(output).not.toContain(secretNotes);
    expect(log.mock.calls).toEqual([
      ["Onboarding: travelers insert failed", "23514"],
    ]);
  });

  it("deletes the trip when the progress insert fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, calls } = fakeSupabase({
      "trip_step_progress.insert": {
        data: null,
        error: { code: "23503", message: secretName },
      },
    });
    const result = await createOnboardingTrip(client, input(), "n", now);

    expect(result).toEqual({ ok: false, error: "create_failed" });
    expect(find(calls, "trips", "delete")[0].filters).toEqual([
      ["id", "trip-1"],
    ]);
  });
});

describe("findLatestTripId", () => {
  it("returns the newest trip id of the user", async () => {
    const { client, calls } = fakeSupabase({
      "trips.select": { data: [{ id: "trip-9" }], error: null },
    });
    expect(await findLatestTripId(client, "user-1")).toEqual({
      ok: true,
      tripId: "trip-9",
    });
    expect(calls[0].filters).toEqual([["user_id", "user-1"]]);
  });

  it("returns null when the user has no trip", async () => {
    const { client } = fakeSupabase({
      "trips.select": { data: [], error: null },
    });
    expect(await findLatestTripId(client, "user-1")).toEqual({
      ok: true,
      tripId: null,
    });
  });

  it("reports a failed lookup", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeSupabase({
      "trips.select": { data: null, error: { code: "500" } },
    });
    expect(await findLatestTripId(client, "user-1")).toEqual({ ok: false });
  });
});
