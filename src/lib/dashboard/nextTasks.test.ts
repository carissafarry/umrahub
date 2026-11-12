import { describe, expect, it } from "vitest";
import { nextTasks } from "./nextTasks";
import type { TripStepProgress } from "./summary";

const step = (n: number, is_shared_step = true) => ({
  id: `step-${n}`,
  sort_order: n * 10,
  is_shared_step,
});

const done = (
  stepId: string,
  travelerId: string | null = null,
  tripId = "trip-1",
): TripStepProgress => ({
  trip_id: tripId,
  step_id: stepId,
  traveler_id: travelerId,
  status: "completed",
});

const none = { configs: [], travelers: [], progress: [] };
const ids = (steps: { id: string }[]) => steps.map((s) => s.id);

describe("nextTasks", () => {
  it("returns at most three unfinished steps in sort_order", () => {
    const steps = [step(5), step(2), step(4), step(1), step(3)];
    expect(ids(nextTasks("trip-1", steps, none))).toEqual([
      "step-1",
      "step-2",
      "step-3",
    ]);
  });

  it("skips completed steps and ignores other trips' rows", () => {
    const steps = [1, 2, 3, 4, 5].map((n) => step(n));
    const progress = [
      done("step-1"),
      done("step-3"),
      { ...done("step-2"), status: "in_progress" as const },
      done("step-4", null, "trip-2"),
    ];
    expect(
      ids(nextTasks("trip-1", steps, { ...none, progress })),
    ).toEqual(["step-2", "step-4", "step-5"]);
  });

  it("keeps a per-traveler step until every traveler is done", () => {
    const steps = [step(1, false), step(2, false)];
    const travelers = [
      { id: "t1", trip_id: "trip-1" },
      { id: "t2", trip_id: "trip-1" },
    ];
    const progress = [done("step-1", "t1"), done("step-2", "t1"), done("step-2", "t2")];
    expect(
      ids(nextTasks("trip-1", steps, { configs: [], travelers, progress })),
    ).toEqual(["step-1"]);
  });

  it("follows the trip's tracking-mode config", () => {
    const steps = [step(1)];
    const configs = [
      { trip_id: "trip-1", step_id: "step-1", tracking_mode: "individual" as const },
    ];
    const travelers = [{ id: "t1", trip_id: "trip-1" }];
    // The trip-level row no longer counts once the step is per traveler.
    expect(
      ids(nextTasks("trip-1", steps, { configs, travelers, progress: [done("step-1")] })),
    ).toEqual(["step-1"]);
    expect(
      nextTasks("trip-1", steps, { configs, travelers, progress: [done("step-1", "t1")] }),
    ).toEqual([]);
  });

  it("is empty when every step is completed", () => {
    const steps = [step(1), step(2)];
    const progress = [done("step-1"), done("step-2")];
    expect(nextTasks("trip-1", steps, { ...none, progress })).toEqual([]);
  });
});
