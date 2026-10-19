import {
  computeProgress,
  type ChecklistStep,
  type StepProgress,
} from "@/lib/trips/checklist";

export type DashboardTrip = {
  id: string;
  name: string;
  departure_city: string;
  planned_departure_date: string | null;
};

// A trip-level (`traveler_id` null) progress row of any of the user's trips.
export type TripStepProgress = StepProgress & { trip_id: string };

export type TripSummary = DashboardTrip & {
  progress: { done: number; total: number; percent: number };
};

// Groups progress rows by trip and counts them like the trip checklist does.
export function summarizeTrips(
  trips: DashboardTrip[],
  steps: ChecklistStep[],
  progress: TripStepProgress[],
): TripSummary[] {
  const byTrip = new Map<string, StepProgress[]>();
  for (const { trip_id, step_id, status } of progress) {
    const rows = byTrip.get(trip_id);
    if (rows) rows.push({ step_id, status });
    else byTrip.set(trip_id, [{ step_id, status }]);
  }
  return trips.map((trip) => ({
    ...trip,
    progress: computeProgress(steps, byTrip.get(trip.id) ?? []),
  }));
}
