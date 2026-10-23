import { describe, expect, it } from "vitest";
import {
  computeProgress,
  type ChecklistStep,
  type TrackedStep,
} from "@/lib/trips/checklist";
import {
  summarizeTrips,
  type DashboardTrip,
  type TripStepConfig,
  type TripStepProgress,
  type TripTraveler,
} from "./summary";

const step = (
  n: number,
  is_shared_step = true,
): ChecklistStep & TrackedStep => ({
  id: `step-${n}`,
  phase_key: "3_6_months_before",
  category_key: "documents",
  title_id: `Langkah ${n}`,
  title_en: `Step ${n}`,
  summary_id: null,
  summary_en: null,
  estimated_cost_min: null,
  estimated_cost_max: null,
  sort_order: n * 10,
  is_shared_step,
});

// Four published shared steps; `step-9` stands for an unpublished one.
const steps = [1, 2, 3, 4].map((n) => step(n));

const trip = (id: string): DashboardTrip => ({
  id,
  name: `Trip ${id}`,
  departure_city: "Jakarta",
  planned_departure_date: "2027-03-01",
});

const row = (
  trip_id: string,
  step_id: string,
  status: TripStepProgress["status"] = "completed",
  traveler_id: string | null = null,
): TripStepProgress => ({ trip_id, step_id, traveler_id, status });

const only = (progress: TripStepProgress[]) => ({
  configs: [],
  travelers: [],
  progress,
});

describe("summarizeTrips", () => {
  it("computes done, total and percent per trip", () => {
    const [a, b] = summarizeTrips(
      [trip("a"), trip("b")],
      steps,
      only([
        row("a", "step-1"),
        row("a", "step-2"),
        row("a", "step-3", "in_progress"),
        row("b", "step-1"),
        row("b", "step-2"),
        row("b", "step-3"),
        row("b", "step-4"),
      ]),
    );
    expect(a.progress).toEqual({ done: 2, total: 4, percent: 50 });
    expect(b.progress).toEqual({ done: 4, total: 4, percent: 100 });
    expect(a).toMatchObject(trip("a"));
  });

  it("shows 0 for a trip without progress rows", () => {
    const [summary] = summarizeTrips(
      [trip("a")],
      steps,
      only([row("b", "step-1")]),
    );
    expect(summary.progress).toEqual({ done: 0, total: 4, percent: 0 });
  });

  it("ignores rows of other trips and of unpublished steps", () => {
    const [summary] = summarizeTrips(
      [trip("a")],
      steps,
      only([
        row("a", "step-1"),
        row("a", "step-9"),
        row("other", "step-2"),
        row("other", "step-3"),
      ]),
    );
    expect(summary.progress).toEqual({ done: 1, total: 4, percent: 25 });
  });

  it("keeps the trips in their given order", () => {
    expect(
      summarizeTrips([trip("b"), trip("a")], steps, only([])).map(
        ({ id }) => id,
      ),
    ).toEqual(["b", "a"]);
  });

  it("counts exactly like computeProgress for the same rows", () => {
    const tripSteps = [step(1, false), step(2), step(3, false)];
    const configs: TripStepConfig[] = [
      { trip_id: "a", step_id: "step-3", tracking_mode: "shared" },
      { trip_id: "b", step_id: "step-2", tracking_mode: "individual" },
    ];
    const travelers: TripTraveler[] = [
      { id: "ahmad", trip_id: "a" },
      { id: "siti", trip_id: "a" },
      { id: "umar", trip_id: "b" },
    ];
    const progress = [
      row("a", "step-1", "completed", "ahmad"),
      row("a", "step-1", "in_progress", "siti"),
      row("a", "step-2"),
      row("a", "step-3"),
      row("b", "step-2", "completed", "umar"),
    ];
    const [a] = summarizeTrips([trip("a")], tripSteps, {
      configs,
      travelers,
      progress,
    });
    const direct = computeProgress(tripSteps, {
      configs: [{ step_id: "step-3", tracking_mode: "shared" }],
      travelerIds: ["ahmad", "siti"],
      progress: progress
        .filter(({ trip_id }) => trip_id === "a")
        .map(({ step_id, traveler_id, status }) => ({
          step_id,
          traveler_id,
          status,
        })),
    });
    expect(a.progress).toEqual(direct);
    expect(a.progress).toEqual({ done: 3, total: 4, percent: 75 });
  });
});
