import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "./fakeSupabase";
import { loadTripBudget, loadTripChecklist } from "./queries";

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

  it.each(["trip_step_config", "travelers", "trip_step_progress"])(
    "throws when the %s query errors",
    async (table) => {
      fake = fakeSupabase({
        tables: {
          trips: { data: trip, error: null },
          [table]: { data: null, error: { message: "boom" } },
        },
      });
      await expect(loadTripChecklist(tripId)).rejects.toThrow(
        "Failed to load checklist",
      );
    },
  );

  it("loads steps, the city's overrides, configs, travelers and all progress", async () => {
    const steps = [{ id: "s1", is_shared_step: false }];
    const configs = [{ step_id: "s1", tracking_mode: "shared" }];
    const travelers = [
      { id: "t1", name: "Ahmad" },
      { id: "t2", name: "Siti" },
    ];
    const progress = [
      { step_id: "s1", traveler_id: null, status: "completed" },
      { step_id: "s1", traveler_id: "t1", status: "in_progress" },
    ];
    fake = fakeSupabase({
      tables: {
        trips: { data: trip, error: null },
        preparation_steps: { data: steps, error: null },
        city_cost_overrides: { data: [], error: null },
        trip_step_config: { data: configs, error: null },
        travelers: { data: travelers, error: null },
        trip_step_progress: { data: progress, error: null },
      },
    });
    expect(await loadTripChecklist(tripId)).toEqual({
      trip,
      steps,
      overrides: [],
      configs,
      travelers,
      progress,
    });

    const query = (table: string) =>
      fake.builders.find((entry) => entry.table === table)!.builder;
    expect(query("preparation_steps").select).toHaveBeenCalledWith(
      expect.stringContaining("is_shared_step"),
    );
    expect(query("preparation_steps").eq).toHaveBeenCalledWith(
      "is_published",
      true,
    );
    expect(query("city_cost_overrides").eq).toHaveBeenCalledWith(
      "city",
      "Surabaya",
    );
    expect(query("trip_step_config").select).toHaveBeenCalledWith(
      "step_id, tracking_mode",
    );
    expect(query("trip_step_config").eq).toHaveBeenCalledWith(
      "trip_id",
      tripId,
    );
    // Only id and name: never the minor, disability or notes fields.
    expect(query("travelers").select).toHaveBeenCalledWith("id, name");
    expect(query("travelers").eq).toHaveBeenCalledWith("trip_id", tripId);
    expect(query("travelers").order.mock.calls).toEqual([
      ["created_at"],
      ["id"],
    ]);
    expect(query("trip_step_progress").select).toHaveBeenCalledWith(
      "step_id, traveler_id, status",
    );
    expect(query("trip_step_progress").eq).toHaveBeenCalledWith(
      "trip_id",
      tripId,
    );
    expect(query("trip_step_progress").is).not.toHaveBeenCalled();
  });
});

describe("loadTripBudget", () => {
  it("redirects a signed-out user to /", async () => {
    fake = fakeSupabase({ user: null });
    await expect(loadTripBudget(tripId)).rejects.toThrow("NEXT_REDIRECT /");
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("404s a non-UUID id without querying the DB", async () => {
    fake = fakeSupabase();
    await expect(loadTripBudget("not-a-uuid")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("404s when the trip query returns no row", async () => {
    fake = fakeSupabase({ tables: { trips: { data: null, error: null } } });
    await expect(loadTripBudget(tripId)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(fake.from).toHaveBeenCalledTimes(1);
  });

  it.each(["preparation_steps", "trip_step_config", "travelers"])(
    "throws when the %s query errors",
    async (table) => {
      fake = fakeSupabase({
        tables: {
          trips: { data: trip, error: null },
          [table]: { data: null, error: { message: "boom" } },
        },
      });
      await expect(loadTripBudget(tripId)).rejects.toThrow(
        "Failed to load budget",
      );
    },
  );

  it("loads steps with is_shared_step, the city's overrides, configs and travelers", async () => {
    const steps = [{ id: "s1", is_shared_step: false }];
    const configs = [{ step_id: "s1", tracking_mode: "shared" }];
    const travelers = [{ id: "t1" }, { id: "t2" }];
    fake = fakeSupabase({
      tables: {
        trips: { data: trip, error: null },
        preparation_steps: { data: steps, error: null },
        city_cost_overrides: { data: [], error: null },
        trip_step_config: { data: configs, error: null },
        travelers: { data: travelers, error: null },
      },
    });
    expect(await loadTripBudget(tripId)).toEqual({
      trip,
      steps,
      overrides: [],
      configs,
      travelers,
    });

    const query = (table: string) =>
      fake.builders.find((entry) => entry.table === table)!.builder;
    expect(query("preparation_steps").select).toHaveBeenCalledWith(
      expect.stringContaining("is_shared_step"),
    );
    expect(query("preparation_steps").eq).toHaveBeenCalledWith(
      "is_published",
      true,
    );
    expect(query("city_cost_overrides").eq).toHaveBeenCalledWith(
      "city",
      "Surabaya",
    );
    expect(query("trip_step_config").select).toHaveBeenCalledWith(
      "step_id, tracking_mode",
    );
    expect(query("trip_step_config").eq).toHaveBeenCalledWith(
      "trip_id",
      tripId,
    );
    expect(query("travelers").select).toHaveBeenCalledWith("id");
    expect(query("travelers").eq).toHaveBeenCalledWith("trip_id", tripId);
  });
});
