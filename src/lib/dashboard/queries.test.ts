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
      profile: { name: "", avatarUrl: null },
      trips: [],
      steps: [],
      configs: [],
      travelers: [],
      progress: [],
    });
    expect(fake.from).toHaveBeenCalledTimes(1);
  });

  it("selects only display columns of the user's trips, newest first", async () => {
    const configs = [
      { trip_id: "trip-1", step_id: "s1", tracking_mode: "shared" },
    ];
    const travelers = [{ id: "t1", trip_id: "trip-1" }];
    const progress = [
      {
        trip_id: "trip-1",
        step_id: "s1",
        traveler_id: "t1",
        status: "completed",
      },
    ];
    fake = fakeSupabase({
      tables: {
        trips: { data: trips, error: null },
        preparation_steps: { data: [], error: null },
        trip_step_config: { data: configs, error: null },
        travelers: { data: travelers, error: null },
        trip_step_progress: { data: progress, error: null },
      },
    });
    expect(await loadDashboard()).toEqual({
      profile: { name: "", avatarUrl: null },
      trips,
      steps: [],
      configs,
      travelers,
      progress,
    });

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
    expect(query("preparation_steps").select).toHaveBeenCalledWith(
      expect.stringContaining("is_shared_step"),
    );
    expect(query("trip_step_config").select).toHaveBeenCalledWith(
      "trip_id, step_id, tracking_mode",
    );
    // Ids only: never the minor or disability fields.
    expect(query("travelers").select).toHaveBeenCalledWith("id, trip_id");
    expect(query("trip_step_progress").select).toHaveBeenCalledWith(
      "trip_id, step_id, traveler_id, status",
    );
    for (const table of [
      "trip_step_config",
      "travelers",
      "trip_step_progress",
    ]) {
      expect(query(table).in).toHaveBeenCalledWith("trip_id", [
        "trip-2",
        "trip-1",
      ]);
    }
    expect(query("trip_step_progress").is).not.toHaveBeenCalled();
    expect(fake.from).toHaveBeenCalledTimes(5);
  });

  it.each(["trip_step_config", "travelers", "trip_step_progress"])(
    "throws a generic error without the raw message when %s fails",
    async (table) => {
      fake = fakeSupabase({
        tables: {
          trips: { data: trips, error: null },
          preparation_steps: { data: [], error: null },
          [table]: { data: null, error: { message: "secret detail" } },
        },
      });
      const error = await loadDashboard().catch((caught: Error) => caught);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Failed to load trip progress");
      expect((error as Error).message).not.toContain("secret");
    },
  );

  it("throws a generic error when the trips query fails", async () => {
    fake = fakeSupabase({
      tables: { trips: { data: null, error: { message: "secret detail" } } },
    });
    await expect(loadDashboard()).rejects.toThrow(/^Failed to load trips$/);
  });
});
