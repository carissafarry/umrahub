import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import { loadDashboard } from "./queries";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

const trips = [
  {
    id: "trip-2",
    name: "Umrah keluarga",
    departure_city: "Medan",
    planned_departure_date: null,
  },
  {
    id: "trip-1",
    name: "Umrah Maret 2027",
    departure_city: "Surabaya",
    planned_departure_date: "2027-03-01",
  },
];

const query = (table: string) =>
  fake.builders.find((entry) => entry.table === table)!.builder;

describe("loadDashboard", () => {
  it("redirects a signed-out user to /", async () => {
    fake = fakeSupabase({ user: null });
    await expect(loadDashboard()).rejects.toThrow("NEXT_REDIRECT /");
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("returns no trips without loading steps or progress", async () => {
    fake = fakeSupabase({ tables: { trips: { data: [], error: null } } });
    expect(await loadDashboard()).toEqual({
      trips: [],
      steps: [],
      progress: [],
    });
    expect(fake.from).toHaveBeenCalledTimes(1);
  });

  it("selects only display columns of the user's trips, newest first", async () => {
    fake = fakeSupabase({
      tables: {
        trips: { data: trips, error: null },
        preparation_steps: { data: [], error: null },
        trip_step_progress: { data: [], error: null },
      },
    });
    expect(await loadDashboard()).toEqual({ trips, steps: [], progress: [] });

    expect(query("trips").select).toHaveBeenCalledWith(
      "id, name, departure_city, planned_departure_date",
    );
    expect(query("trips").eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query("trips").order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(query("preparation_steps").eq).toHaveBeenCalledWith(
      "is_published",
      true,
    );
    expect(query("trip_step_progress").select).toHaveBeenCalledWith(
      "trip_id, step_id, status",
    );
    expect(query("trip_step_progress").in).toHaveBeenCalledWith("trip_id", [
      "trip-2",
      "trip-1",
    ]);
    expect(query("trip_step_progress").is).toHaveBeenCalledWith(
      "traveler_id",
      null,
    );
    expect(fake.from).toHaveBeenCalledTimes(3);
  });

  it("throws a generic error without the raw message", async () => {
    fake = fakeSupabase({
      tables: {
        trips: { data: trips, error: null },
        preparation_steps: { data: [], error: null },
        trip_step_progress: {
          data: null,
          error: { message: "secret detail" },
        },
      },
    });
    const error = await loadDashboard().catch((caught: Error) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Failed to load trip progress");
    expect((error as Error).message).not.toContain("secret");
  });

  it("throws a generic error when the trips query fails", async () => {
    fake = fakeSupabase({
      tables: { trips: { data: null, error: { message: "secret detail" } } },
    });
    await expect(loadDashboard()).rejects.toThrow(/^Failed to load trips$/);
  });
});
