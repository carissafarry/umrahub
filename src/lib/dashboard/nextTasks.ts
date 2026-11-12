import {
  compareSteps,
  stepStatus,
  type ChecklistStep,
  type TrackedStep,
} from "@/lib/trips/checklist";
import type { TripStepConfig, TripStepProgress, TripTraveler } from "./summary";

export const maxNextTasks = 3;

// The trip's first unfinished steps in sort_order, for the Beranda. A step
// tracked per traveler counts as unfinished until every traveler is done.
export function nextTasks<
  T extends TrackedStep & Pick<ChecklistStep, "sort_order">,
>(
  tripId: string,
  steps: T[],
  {
    configs,
    travelers,
    progress,
  }: {
    configs: TripStepConfig[];
    travelers: TripTraveler[];
    progress: TripStepProgress[];
  },
): T[] {
  const tracking = {
    configs: configs.filter((row) => row.trip_id === tripId),
    travelerIds: travelers
      .filter((row) => row.trip_id === tripId)
      .map((row) => row.id),
    progress: progress.filter((row) => row.trip_id === tripId),
  };
  return [...steps]
    .sort(compareSteps)
    .filter((step) => stepStatus(step, tracking) !== "completed")
    .slice(0, maxNextTasks);
}
