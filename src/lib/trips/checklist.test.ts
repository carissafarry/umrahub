import { describe, expect, it } from "vitest";
import {
  computeProgress,
  costText,
  formatRupiah,
  groupSteps,
  isStepStatus,
  isUuid,
  resolveCost,
  stepStatus,
  type ChecklistStep,
  type CityCostOverride,
} from "./checklist";

// Phase, category and costs of the 22 seeded steps, in seed order.
const seed: [string, string, number | null, number | null][] = [
  ["3_6_months_before", "documents", 350000, 650000],
  ["3_6_months_before", "documents", 25000, 75000],
  ["3_6_months_before", "documents", 0, 50000],
  ["3_6_months_before", "health", 300000, 800000],
  ["3_6_months_before", "health", 200000, 1000000],
  ["3_6_months_before", "financial", null, null],
  ["2_3_months_before", "documents", 1500000, 3500000],
  ["2_3_months_before", "documents", 300000, 1000000],
  ["2_3_months_before", "booking", 9000000, 18000000],
  ["2_3_months_before", "booking", 3000000, 12000000],
  ["2_3_months_before", "financial", null, null],
  ["1_month_before", "preparation", 150000, 600000],
  ["1_month_before", "preparation", null, null],
  ["1_month_before", "preparation", null, null],
  ["1_month_before", "documents", null, null],
  ["1_week_before", "final_checks", null, null],
  ["1_week_before", "final_checks", 10000, 50000],
  ["1_week_before", "final_checks", 150000, 500000],
  ["1_week_before", "spiritual", 0, 500000],
  ["departure_day", "checklist", null, null],
  ["departure_day", "checklist", 100000, 500000],
  ["departure_day", "checklist", null, null],
];

const stepId = (n: number) =>
  `5eed0000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

const steps: ChecklistStep[] = seed.map(([phase, category, min, max], i) => ({
  id: stepId(i + 1),
  phase_key: phase,
  category_key: category,
  title_id: `Langkah ${i + 1}`,
  title_en: `Step ${i + 1}`,
  summary_id: null,
  summary_en: null,
  estimated_cost_min: min,
  estimated_cost_max: max,
  sort_order: (i + 1) * 10,
}));

const step = (n: number) => steps[n - 1];

const overrides: CityCostOverride[] = [
  ["Jakarta", 9000000, 15000000],
  ["Surabaya", 10000000, 16000000],
  ["Medan", 9500000, 16000000],
  ["Makassar", 11000000, 18000000],
  ["Yogyakarta", 10500000, 17000000],
].map(([city, min, max]) => ({
  step_id: stepId(9),
  city: city as string,
  cost_min: min as number,
  cost_max: max as number,
}));

describe("groupSteps", () => {
  it("orders seed phases and categories by sort_order", () => {
    // Shuffled input must not change the result.
    const phases = groupSteps([...steps].reverse());
    expect(phases.map((phase) => phase.key)).toEqual([
      "3_6_months_before",
      "2_3_months_before",
      "1_month_before",
      "1_week_before",
      "departure_day",
    ]);
    const oneMonth = phases.find((phase) => phase.key === "1_month_before");
    expect(oneMonth?.categories.map((category) => category.key)).toEqual([
      "preparation",
      "documents",
    ]);
    expect(phases[0].categories[0].steps.map((s) => s.id)).toEqual([
      stepId(1),
      stepId(2),
      stepId(3),
    ]);
  });

  it("breaks sort_order ties by id", () => {
    const a = { ...step(1), id: "b", sort_order: 5 };
    const b = { ...step(1), id: "a", sort_order: 5 };
    expect(groupSteps([a, b])[0].categories[0].steps.map((s) => s.id)).toEqual(
      ["a", "b"],
    );
  });

  it("returns no phases for no steps", () => {
    expect(groupSteps([])).toEqual([]);
  });
});

describe("stepStatus", () => {
  it("defaults to not_started without a progress row", () => {
    expect(stepStatus(stepId(1), [])).toBe("not_started");
  });

  it("uses the trip-level progress row", () => {
    expect(
      stepStatus(stepId(1), [{ step_id: stepId(1), status: "in_progress" }]),
    ).toBe("in_progress");
  });
});

describe("computeProgress", () => {
  it("counts only completed steps", () => {
    expect(
      computeProgress(
        [step(1), step(2), step(3)],
        [
          { step_id: stepId(1), status: "completed" },
          { step_id: stepId(2), status: "in_progress" },
        ],
      ),
    ).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it("is 0% with no steps", () => {
    expect(computeProgress([], [])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("rounds to a whole percent", () => {
    expect(
      computeProgress(steps, [
        { step_id: stepId(1), status: "completed" },
        { step_id: stepId(2), status: "completed" },
      ]).percent,
    ).toBe(9);
  });
});

describe("resolveCost", () => {
  it("uses the departure city's override", () => {
    expect(resolveCost(step(9), overrides, "Surabaya")).toEqual({
      min: 10000000,
      max: 16000000,
    });
  });

  it("falls back to the step's own range", () => {
    expect(resolveCost(step(9), overrides, "Bandung")).toEqual({
      min: 9000000,
      max: 18000000,
    });
  });

  it("matches the city exactly and case-sensitively", () => {
    expect(resolveCost(step(9), overrides, "surabaya")).toEqual({
      min: 9000000,
      max: 18000000,
    });
  });

  it("ignores overrides of other steps", () => {
    expect(resolveCost(step(10), overrides, "Surabaya")).toEqual({
      min: 3000000,
      max: 12000000,
    });
  });
});

describe("costText", () => {
  it("formats rupiah the id-ID way", () => {
    expect(formatRupiah(350000)).toBe("Rp 350.000");
  });

  it("formats a range", () => {
    expect(costText({ min: 350000, max: 650000 })).toEqual({
      key: "range",
      values: { min: "Rp 350.000", max: "Rp 650.000" },
    });
  });

  it("formats min only", () => {
    expect(costText({ min: 100000, max: null })).toEqual({
      key: "from",
      values: { min: "Rp 100.000" },
    });
  });

  it("formats max only", () => {
    expect(costText({ min: null, max: 500000 })).toEqual({
      key: "upTo",
      values: { max: "Rp 500.000" },
    });
  });

  it("formats min = max as one value", () => {
    expect(costText({ min: 500000, max: 500000 })).toEqual({
      key: "single",
      values: { amount: "Rp 500.000" },
    });
  });

  it("keeps a zero minimum as a range", () => {
    expect(costText({ min: 0, max: 50000 }).key).toBe("range");
  });

  it("yields the no-estimate key when both are null", () => {
    expect(costText(resolveCost(step(6), overrides, "Surabaya"))).toEqual({
      key: "none",
      values: {},
    });
  });
});

describe("validators", () => {
  it("accepts UUIDs only", () => {
    expect(isUuid(stepId(1))).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("accepts the three statuses only", () => {
    expect(isStepStatus("completed")).toBe(true);
    expect(isStepStatus("done")).toBe(false);
  });
});
