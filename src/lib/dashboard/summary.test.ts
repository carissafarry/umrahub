import { describe, expect, it } from "vitest";
import type { ChecklistStep } from "@/lib/trips/checklist";
import {
  summarizeTrips,
  type DashboardTrip,
  type TripStepProgress,
} from "./summary";

const step = (n: number): ChecklistStep => ({
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
});

// Four published steps; `step-9` stands for an unpublished one.
const steps = [1, 2, 3, 4].map(step);

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
): TripStepProgress => ({ trip_id, step_id, status });

describe("summarizeTrips", () => {
  it("computes done, total and percent per trip", () => {
    const [a, b] = summarizeTrips(
      [trip("a"), trip("b")],
      steps,
      [
        row("a", "step-1"),
        row("a", "step-2"),
        row("a", "step-3", "in_progress"),
        row("b", "step-1"),
        row("b", "step-2"),
        row("b", "step-3"),
        row("b", "step-4"),
      ],
    );
    expect(a.progress).toEqual({ done: 2, total: 4, percent: 50 });
    expect(b.progress).toEqual({ done: 4, total: 4, percent: 100 });
    expect(a).toMatchObject(trip("a"));
  });

  it("shows 0 for a trip without progress rows", () => {
    const [summary] = summarizeTrips([trip("a")], steps, [row("b", "step-1")]);
    expect(summary.progress).toEqual({ done: 0, total: 4, percent: 0 });
  });

  it("ignores rows of other trips and of unpublished steps", () => {
    const [summary] = summarizeTrips([trip("a")], steps, [
      row("a", "step-1"),
      row("a", "step-9"),
      row("other", "step-2"),
      row("other", "step-3"),
    ]);
    expect(summary.progress).toEqual({ done: 1, total: 4, percent: 25 });
  });

  it("keeps the trips in their given order", () => {
    expect(
      summarizeTrips([trip("b"), trip("a")], steps, []).map(({ id }) => id),
    ).toEqual(["b", "a"]);
  });
});
