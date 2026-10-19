// Pure trip-budget logic: per-step, per-phase and overall cost totals.
// No React or Supabase imports, so it is easy to unit test.
import {
  groupSteps,
  resolveCost,
  type ChecklistStep,
  type CityCostOverride,
  type CostRange,
} from "./checklist";

export type BudgetStep = ChecklistStep & { is_shared_step: boolean };

// A per-trip trip_step_config row; it wins over `is_shared_step`.
export type StepConfig = {
  step_id: string;
  tracking_mode: "shared" | "individual";
};

export type StepBudget = {
  step: BudgetStep;
  perPerson: CostRange;
  individual: boolean;
  multiplier: number;
  total: CostRange;
};

export type BudgetTotal = { min: number; max: number };

export type PhaseBudget = {
  key: string;
  steps: StepBudget[];
  total: BudgetTotal;
};

export function isIndividual(step: BudgetStep, configs: StepConfig[]) {
  const config = configs.find((row) => row.step_id === step.id);
  return config ? config.tracking_mode === "individual" : !step.is_shared_step;
}

const multiply = (amount: number | null, multiplier: number) =>
  amount === null ? null : amount * multiplier;

// A null min counts as 0; a null max counts as the min, or 0.
function addRange(sum: BudgetTotal, { min, max }: CostRange): BudgetTotal {
  return { min: sum.min + (min ?? 0), max: sum.max + (max ?? min ?? 0) };
}

export function computeBudget({
  steps,
  overrides,
  departureCity,
  configs,
  travelerCount,
}: {
  steps: BudgetStep[];
  overrides: CityCostOverride[];
  departureCity: string;
  configs: StepConfig[];
  travelerCount: number;
}) {
  const travelers = Math.max(1, travelerCount);
  const phases: PhaseBudget[] = groupSteps(steps).map((phase) => {
    const phaseSteps = phase.categories
      .flatMap((category) => category.steps)
      .map((step) => {
        const perPerson = resolveCost(step, overrides, departureCity);
        const individual = isIndividual(step, configs);
        const multiplier = individual ? travelers : 1;
        return {
          step,
          perPerson,
          individual,
          multiplier,
          total: {
            min: multiply(perPerson.min, multiplier),
            max: multiply(perPerson.max, multiplier),
          },
        };
      });
    return {
      key: phase.key,
      steps: phaseSteps,
      total: phaseSteps.reduce((sum, row) => addRange(sum, row.total), {
        min: 0,
        max: 0,
      }),
    };
  });
  const total = phases.reduce((sum, phase) => addRange(sum, phase.total), {
    min: 0,
    max: 0,
  });
  return { travelers, phases, total };
}
