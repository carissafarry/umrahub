import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "./fakeSupabase";
import { loadTripChecklist } from "./queries";

const tripId = "11111111-1111-4111-8111-111111111111";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

// Like Next, both stop rendering by throwing.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

const trip = { id: tripId, name: "Umrah keluarga", departure_city: "Surabaya" };

describe("loadTripChecklist", () => {
  it("redirects a signed-out user to /", async () => {
    fake = fakeSupabase({ user: null });
    await expect(loadTripChecklist(tripId)).rejects.toThrow("NEXT_REDIRECT /");
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("404s a non-UUID id without querying the DB", async () => {
    fake = fakeSupabase();
    await expect(loadTripChecklist("not-a-uuid")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("404s when the trip query returns no row", async () => {
    fake = fakeSupabase({ tables: { trips: { data: null, error: null } } });
    await expect(loadTripChecklist(tripId)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(fake.from).toHaveBeenCalledTimes(1);
  });

  it("throws on a query error", async () => {
    fake = fakeSupabase({
      tables: {
        trips: { data: trip, error: null },
        preparation_steps: { data: null, error: { message: "boom" } },
      },
    });
    await expect(loadTripChecklist(tripId)).rejects.toThrow(
      "Failed to load checklist",
    );
  });

  it("loads published steps, the city's overrides and trip-level progress", async () => {
    fake = fakeSupabase({
      tables: {
        trips: { data: trip, error: null },
        preparation_steps: { data: [], error: null },
        city_cost_overrides: { data: [], error: null },
        trip_step_progress: { data: [], error: null },
      },
    });
    expect(await loadTripChecklist(tripId)).toEqual({
      trip,
      steps: [],
      overrides: [],
      progress: [],
    });

    const query = (table: string) =>
      fake.builders.find((entry) => entry.table === table)!.builder;
    expect(query("preparation_steps").eq).toHaveBeenCalledWith(
      "is_published",
      true,
    );
    expect(query("city_cost_overrides").eq).toHaveBeenCalledWith(
      "city",
      "Surabaya",
    );
    expect(query("trip_step_progress").eq).toHaveBeenCalledWith(
      "trip_id",
      tripId,
    );
    expect(query("trip_step_progress").is).toHaveBeenCalledWith(
      "traveler_id",
      null,
    );
  });
});
