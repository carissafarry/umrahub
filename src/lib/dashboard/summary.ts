import {
  computeProgress,
  type StepConfig,
  type StepProgress,
  type TrackedStep,
  type TripTracking,
} from "@/lib/trips/checklist";

export type DashboardTrip = {
  id: string;
  name: string;
  departure_city: string;
  planned_departure_date: string | null;
};

// Config, traveler and progress rows of any of the user's trips.
export type TripStepConfig = StepConfig & { trip_id: string };
export type TripTraveler = { id: string; trip_id: string };
export type TripStepProgress = StepProgress & { trip_id: string };

export type TripSummary = DashboardTrip & {
  progress: { done: number; total: number; percent: number };
};

// Groups the rows by trip and counts them like the trip checklist does.
export function summarizeTrips(
  trips: DashboardTrip[],
  steps: TrackedStep[],
  {
    configs,
    travelers,
    progress,
  }: {
    configs: TripStepConfig[];
    travelers: TripTraveler[];
    progress: TripStepProgress[];
  },
): TripSummary[] {
  const byTrip = new Map<string, TripTracking>();
  const tracking = (tripId: string) => {
    let entry = byTrip.get(tripId);
    if (!entry) {
      entry = { configs: [], travelerIds: [], progress: [] };
      byTrip.set(tripId, entry);
    }
    return entry;
  };
  for (const { trip_id, step_id, tracking_mode } of configs) {
    tracking(trip_id).configs.push({ step_id, tracking_mode });
  }
  for (const { trip_id, id } of travelers) {
    tracking(trip_id).travelerIds.push(id);
  }
  for (const { trip_id, step_id, traveler_id, status } of progress) {
    tracking(trip_id).progress.push({ step_id, traveler_id, status });
  }
  return trips.map((trip) => ({
    ...trip,
    progress: computeProgress(steps, tracking(trip.id)),
  }));
}
