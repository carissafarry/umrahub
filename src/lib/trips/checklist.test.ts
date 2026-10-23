import { describe, expect, it } from "vitest";
import {
  aggregateStatus,
  computeProgress,
  costText,
  formatRupiah,
  groupSteps,
  incompletePrerequisites,
  isIndividual,
  isPerTraveler,
  isStepStatus,
  isTrackingMode,
  isUuid,
  resolveCost,
  stepStatus,
  travelerStatus,
  type ChecklistStep,
  type CityCostOverride,
  type StepProgress,
  type StepStatus,
  type TrackedStep,
  type TripTracking,
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

// Every fixture step is shared by default unless a test says otherwise.
const steps: (ChecklistStep & TrackedStep)[] = seed.map(
  ([phase, category, min, max], i) => ({
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
    is_shared_step: true,
  }),
);

const step = (n: number) => steps[n - 1];

const ahmad = "aaaaaaaa-0000-4000-8000-000000000001";
const siti = "aaaaaaaa-0000-4000-8000-000000000002";

const row = (
  n: number,
  status: StepStatus,
  travelerId: string | null = null,
): StepProgress => ({ step_id: stepId(n), traveler_id: travelerId, status });

// A trip with no configs or travelers unless given.
const trip = (
  progress: StepProgress[],
  rest: Partial<Omit<TripTracking, "progress">> = {},
): TripTracking => ({ configs: [], travelerIds: [], progress, ...rest });

const individual = (n: number) => ({ ...step(n), is_shared_step: false });

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

describe("isIndividual", () => {
  it("follows is_shared_step without a config row", () => {
    expect(isIndividual(step(1), [])).toBe(false);
    expect(isIndividual(individual(1), [])).toBe(true);
  });

  it("lets a trip_step_config row override is_shared_step both ways", () => {
    expect(
      isIndividual(step(1), [
        { step_id: stepId(1), tracking_mode: "individual" },
      ]),
    ).toBe(true);
    expect(
      isIndividual(individual(1), [
        { step_id: stepId(1), tracking_mode: "shared" },
      ]),
    ).toBe(false);
    // Configs of other steps don't apply.
    expect(
      isIndividual(step(1), [
        { step_id: stepId(2), tracking_mode: "individual" },
      ]),
    ).toBe(false);
  });
});

describe("isPerTraveler", () => {
  const travelers = { travelerIds: [ahmad, siti] };

  it("is true for an individual step on a trip with travelers", () => {
    expect(isPerTraveler(individual(1), trip([], travelers))).toBe(true);
  });

  it("is false for a shared step", () => {
    expect(isPerTraveler(step(1), trip([], travelers))).toBe(false);
  });

  it("is false for an individual step on a trip without travelers", () => {
    expect(isPerTraveler(individual(1), trip([]))).toBe(false);
  });

  it("follows the config row over is_shared_step", () => {
    expect(
      isPerTraveler(
        step(1),
        trip([], {
          ...travelers,
          configs: [{ step_id: stepId(1), tracking_mode: "individual" }],
        }),
      ),
    ).toBe(true);
    expect(
      isPerTraveler(
        individual(1),
        trip([], {
          ...travelers,
          configs: [{ step_id: stepId(1), tracking_mode: "shared" }],
        }),
      ),
    ).toBe(false);
  });
});

describe("travelerStatus", () => {
  const progress = [
    row(1, "in_progress"),
    row(1, "completed", ahmad),
    row(2, "in_progress", siti),
  ];

  it("reads that traveler's row", () => {
    expect(travelerStatus(stepId(1), ahmad, progress)).toBe("completed");
  });

  it("reads the trip-level row for a null traveler", () => {
    expect(travelerStatus(stepId(1), null, progress)).toBe("in_progress");
    expect(travelerStatus(stepId(2), null, progress)).toBe("not_started");
  });

  it("defaults to not_started without a row", () => {
    expect(travelerStatus(stepId(1), siti, progress)).toBe("not_started");
  });
});

describe("aggregateStatus", () => {
  it("is completed only when everyone is done", () => {
    expect(aggregateStatus(["completed", "completed"])).toBe("completed");
  });

  it("is not_started only when nobody started", () => {
    expect(aggregateStatus(["not_started", "not_started"])).toBe("not_started");
  });

  it.each<StepStatus[][]>([
    [["completed", "not_started"]],
    [["in_progress", "in_progress"]],
    [["not_started", "in_progress"]],
  ])("is in_progress for mixed statuses %j", (statuses) => {
    expect(aggregateStatus(statuses)).toBe("in_progress");
  });
});

describe("stepStatus", () => {
  it("defaults to not_started without a progress row", () => {
    expect(stepStatus(step(1), trip([]))).toBe("not_started");
  });

  it("uses the trip-level progress row of a shared step", () => {
    expect(
      stepStatus(
        step(1),
        trip([row(1, "in_progress"), row(1, "completed", ahmad)], {
          travelerIds: [ahmad],
        }),
      ),
    ).toBe("in_progress");
  });

  it("aggregates a per-traveler step", () => {
    const tracking = (progress: StepProgress[]) =>
      trip(progress, { travelerIds: [ahmad, siti] });
    expect(
      stepStatus(
        individual(1),
        tracking([row(1, "completed", ahmad), row(1, "completed")]),
      ),
    ).toBe("in_progress");
    expect(
      stepStatus(
        individual(1),
        tracking([row(1, "completed", ahmad), row(1, "completed", siti)]),
      ),
    ).toBe("completed");
    expect(stepStatus(individual(1), tracking([]))).toBe("not_started");
  });

  it("uses the trip-level row of an individual step on a trip with 0 travelers", () => {
    expect(
      stepStatus(
        individual(1),
        trip([row(1, "completed"), row(1, "not_started", ahmad)]),
      ),
    ).toBe("completed");
  });
});

describe("incompletePrerequisites", () => {
  // Seeded step 09 (book flights) depends on 01, 02 and 04.
  const flights = (dependencies: string[] | null) => ({
    id: stepId(9),
    dependency_step_ids: dependencies,
  });
  const ids = (list: ChecklistStep[]) => list.map((s) => s.id);
  const done = (...ns: number[]) => ns.map((n) => row(n, "completed"));

  it("returns nothing without dependencies", () => {
    expect(incompletePrerequisites(flights(null), steps, trip([]))).toEqual([]);
    expect(incompletePrerequisites(flights([]), steps, trip([]))).toEqual([]);
  });

  it("returns nothing when every prerequisite is completed", () => {
    expect(
      incompletePrerequisites(
        flights([stepId(1), stepId(2), stepId(4)]),
        steps,
        trip(done(1, 2, 4)),
      ),
    ).toEqual([]);
  });

  it("returns only incomplete prerequisites, in sort_order", () => {
    const progress = [...done(2), row(1, "in_progress")];
    expect(
      ids(
        incompletePrerequisites(
          flights([stepId(4), stepId(2), stepId(1)]),
          [...steps].reverse(),
          trip(progress),
        ),
      ),
    ).toEqual([stepId(1), stepId(4)]);
  });

  it("counts a prerequisite without a progress row as incomplete", () => {
    expect(
      ids(incompletePrerequisites(flights([stepId(4)]), steps, trip([]))),
    ).toEqual([stepId(4)]);
  });

  it("ignores unknown ids and the step itself", () => {
    const unknown = "5eed0000-0000-4000-8000-000000000099";
    expect(
      ids(
        incompletePrerequisites(
          flights([unknown, stepId(9), stepId(1)]),
          steps,
          trip([]),
        ),
      ),
    ).toEqual([stepId(1)]);
  });

  it("judges a per-traveler prerequisite on its aggregate status", () => {
    const tripSteps = [individual(1), ...steps.slice(1)];
    const tracking = (progress: StepProgress[]) =>
      trip(progress, { travelerIds: [ahmad, siti] });
    expect(
      ids(
        incompletePrerequisites(
          flights([stepId(1)]),
          tripSteps,
          tracking([row(1, "completed", ahmad), row(1, "completed")]),
        ),
      ),
    ).toEqual([stepId(1)]);
    expect(
      incompletePrerequisites(
        flights([stepId(1)]),
        tripSteps,
        tracking([row(1, "completed", ahmad), row(1, "completed", siti)]),
      ),
    ).toEqual([]);
  });
});

describe("computeProgress", () => {
  it("counts only completed steps", () => {
    expect(
      computeProgress(
        [step(1), step(2), step(3)],
        trip([row(1, "completed"), row(2, "in_progress")]),
      ),
    ).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it("is 0% with no steps", () => {
    expect(computeProgress([], trip([]))).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });
  });

  it("rounds to a whole percent", () => {
    expect(
      computeProgress(steps, trip([row(1, "completed"), row(2, "completed")]))
        .percent,
    ).toBe(9);
  });

  it("counts a per-traveler step once per traveler", () => {
    // Traveler A is done with the individual step, B isn't; the shared step
    // is done.
    expect(
      computeProgress(
        [individual(1), step(2)],
        trip(
          [
            row(1, "completed", ahmad),
            row(1, "in_progress", siti),
            row(2, "completed"),
          ],
          { travelerIds: [ahmad, siti] },
        ),
      ),
    ).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it("ignores per-traveler rows of a shared step and trip-level rows of a per-traveler step", () => {
    expect(
      computeProgress(
        [individual(1), step(2)],
        trip([row(1, "completed"), row(2, "completed", ahmad)], {
          travelerIds: [ahmad, siti],
        }),
      ),
    ).toEqual({ done: 0, total: 3, percent: 0 });
  });

  it("counts an individual step as one trip-level unit with 0 travelers", () => {
    expect(
      computeProgress([individual(1), step(2)], trip([row(1, "completed")])),
    ).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it("follows config rows in both directions", () => {
    const tracking = trip([row(1, "completed"), row(2, "completed", ahmad)], {
      travelerIds: [ahmad, siti],
      configs: [
        { step_id: stepId(1), tracking_mode: "shared" },
        { step_id: stepId(2), tracking_mode: "individual" },
      ],
    });
    expect(computeProgress([individual(1), step(2)], tracking)).toEqual({
      done: 2,
      total: 3,
      percent: 67,
    });
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

  it("accepts the two tracking modes only", () => {
    expect(isTrackingMode("shared")).toBe(true);
    expect(isTrackingMode("individual")).toBe(true);
    expect(isTrackingMode("per_traveler")).toBe(false);
  });
});
