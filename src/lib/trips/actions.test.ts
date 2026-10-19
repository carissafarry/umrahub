import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateStepStatus } from "./actions";
import { fakeSupabase } from "./fakeSupabase";

const tripId = "11111111-1111-4111-8111-111111111111";
const stepId = "5eed0000-0000-4000-8000-000000000009";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const ownedTrip = {
  trips: { data: { id: tripId }, error: null },
  preparation_steps: { data: { id: stepId }, error: null },
  trip_step_progress: { data: null, error: null },
};

function writes() {
  return fake.builders.flatMap(({ builder }) => [
    ...builder.upsert.mock.calls,
    ...builder.insert.mock.calls,
    ...builder.update.mock.calls,
  ]);
}

describe("updateStepStatus", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
  });

  it.each([
    ["not-a-uuid", stepId, "completed"],
    [tripId, "not-a-uuid", "completed"],
    [tripId, stepId, "done"],
  ])("rejects invalid input %s %s %s without touching the DB", async (...args) => {
    fake = fakeSupabase({ tables: ownedTrip });
    expect(await updateStepStatus(...args)).toEqual({ ok: false });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null, tables: ownedTrip });
    expect(await updateStepStatus(tripId, stepId, "completed")).toEqual({
      ok: false,
    });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a trip the user doesn't own without writing", async () => {
    fake = fakeSupabase({
      tables: { ...ownedTrip, trips: { data: null, error: null } },
    });
    expect(await updateStepStatus(tripId, stepId, "completed")).toEqual({
      ok: false,
    });
    const trips = fake.builders.find(({ table }) => table === "trips")!;
    expect(trips.builder.eq).toHaveBeenCalledWith("id", tripId);
    expect(trips.builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(writes()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an unpublished or unknown step without writing", async () => {
    fake = fakeSupabase({
      tables: { ...ownedTrip, preparation_steps: { data: null, error: null } },
    });
    expect(await updateStepStatus(tripId, stepId, "completed")).toEqual({
      ok: false,
    });
    expect(writes()).toEqual([]);
  });

  it("returns a plain error when the write fails", async () => {
    fake = fakeSupabase({
      tables: {
        ...ownedTrip,
        trip_step_progress: { data: null, error: { message: "db detail" } },
      },
    });
    expect(await updateStepStatus(tripId, stepId, "completed")).toEqual({
      ok: false,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["not_started", "in_progress", "completed"])(
    "upserts the trip-level row for %s",
    async (status) => {
      fake = fakeSupabase({ tables: ownedTrip });
      expect(await updateStepStatus(tripId, stepId, status)).toEqual({
        ok: true,
      });

      expect(writes()).toHaveLength(1);
      const [payload, options] = writes()[0] as [
        Record<string, unknown>,
        unknown,
      ];
      expect(payload).toMatchObject({
        trip_id: tripId,
        step_id: stepId,
        traveler_id: null,
        status,
      });
      if (status === "completed") {
        expect(typeof payload.completed_at).toBe("string");
        expect(Number.isNaN(Date.parse(payload.completed_at as string))).toBe(
          false,
        );
      } else {
        expect(payload.completed_at).toBeNull();
      }
      expect(options).toEqual({ onConflict: "trip_id,step_id,traveler_id" });
      expect(revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
    },
  );
});
