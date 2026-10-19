import { describe, expect, it } from "vitest";
import { computeBudget, type BudgetStep } from "./budget";
import { isIndividual } from "./checklist";

const stepId = (n: number) =>
  `5eed0000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

function makeStep(
  n: number,
  overrides: Partial<BudgetStep> = {},
): BudgetStep {
  return {
    id: stepId(n),
    phase_key: "2_3_months_before",
    category_key: "booking",
    title_id: `Langkah ${n}`,
    title_en: `Step ${n}`,
    summary_id: null,
    summary_en: null,
    estimated_cost_min: 1000000,
    estimated_cost_max: 2000000,
    sort_order: n * 10,
    is_shared_step: true,
    ...overrides,
  };
}

const budget = (
  steps: BudgetStep[],
  options: Partial<Parameters<typeof computeBudget>[0]> = {},
) =>
  computeBudget({
    steps,
    overrides: [],
    departureCity: "Surabaya",
    configs: [],
    travelerCount: 3,
    ...options,
  });

describe("computeBudget", () => {
  it("multiplies individual steps by the traveler count, not shared ones", () => {
    const result = budget([
      makeStep(9, { is_shared_step: false }),
      makeStep(7, { is_shared_step: true }),
    ]);
    const [shared, individual] = result.phases[0].steps;

    expect(individual.step.id).toBe(stepId(9));
    expect(individual).toMatchObject({
      perPerson: { min: 1000000, max: 2000000 },
      individual: true,
      multiplier: 3,
      total: { min: 3000000, max: 6000000 },
    });
    expect(shared).toMatchObject({
      individual: false,
      multiplier: 1,
      total: { min: 1000000, max: 2000000 },
    });
  });

  it("lets a trip_step_config row override is_shared_step both ways", () => {
    const sharedByDefault = makeStep(7, { is_shared_step: true });
    const individualByDefault = makeStep(9, { is_shared_step: false });
    const configs = [
      { step_id: stepId(7), tracking_mode: "individual" as const },
      { step_id: stepId(9), tracking_mode: "shared" as const },
    ];
    expect(isIndividual(sharedByDefault, configs)).toBe(true);
    expect(isIndividual(individualByDefault, configs)).toBe(false);

    const [seven, nine] = budget([sharedByDefault, individualByDefault], {
      configs,
    }).phases[0].steps;
    expect(seven.total).toEqual({ min: 3000000, max: 6000000 });
    expect(nine.total).toEqual({ min: 1000000, max: 2000000 });
  });

  it("applies the departure city's override", () => {
    const [flight] = budget([makeStep(9, { is_shared_step: false })], {
      overrides: [
        { step_id: stepId(9), city: "Surabaya", cost_min: 10000000, cost_max: 16000000 },
        { step_id: stepId(9), city: "Jakarta", cost_min: 1, cost_max: 2 },
      ],
      travelerCount: 2,
    }).phases[0].steps;
    expect(flight.perPerson).toEqual({ min: 10000000, max: 16000000 });
    expect(flight.total).toEqual({ min: 20000000, max: 32000000 });
  });

  it("keeps null costs in the step and sums them as 0 or the min", () => {
    const result = budget([
      makeStep(1, { estimated_cost_min: null, estimated_cost_max: null }),
      makeStep(2, { estimated_cost_min: 500000, estimated_cost_max: null }),
      makeStep(3, { estimated_cost_min: null, estimated_cost_max: 300000 }),
    ]);
    const [none, from, upTo] = result.phases[0].steps;
    expect(none.total).toEqual({ min: null, max: null });
    expect(from.total).toEqual({ min: 500000, max: null });
    expect(upTo.total).toEqual({ min: null, max: 300000 });
    expect(result.phases[0].total).toEqual({ min: 500000, max: 800000 });
  });

  it("sums each phase in timeline order and the overall total", () => {
    const result = budget(
      [
        makeStep(20, { phase_key: "departure_day", estimated_cost_min: 100000, estimated_cost_max: 500000 }),
        makeStep(1, { phase_key: "3_6_months_before", estimated_cost_min: 350000, estimated_cost_max: 650000 }),
        makeStep(2, { phase_key: "3_6_months_before", is_shared_step: false, estimated_cost_min: 25000, estimated_cost_max: 75000 }),
        makeStep(9, { is_shared_step: false }),
      ],
      { travelerCount: 2 },
    );
    expect(result.phases.map((phase) => [phase.key, phase.total])).toEqual([
      ["3_6_months_before", { min: 400000, max: 800000 }],
      ["2_3_months_before", { min: 2000000, max: 4000000 }],
      ["departure_day", { min: 100000, max: 500000 }],
    ]);
    expect(result.total).toEqual({ min: 2500000, max: 5300000 });
  });

  it("never multiplies by less than one traveler", () => {
    const result = budget([makeStep(9, { is_shared_step: false })], {
      travelerCount: 0,
    });
    expect(result.travelers).toBe(1);
    expect(result.total).toEqual({ min: 1000000, max: 2000000 });
  });

  it("returns empty totals without steps", () => {
    expect(budget([])).toEqual({
      travelers: 3,
      phases: [],
      total: { min: 0, max: 0 },
    });
  });
});
