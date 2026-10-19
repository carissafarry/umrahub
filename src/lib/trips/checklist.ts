// Pure trip-checklist logic: grouping, status, progress and costs.
// No React or Supabase imports, so it is easy to unit test.

export const stepStatuses = ["not_started", "in_progress", "completed"] as const;

export type StepStatus = (typeof stepStatuses)[number];

export type ChecklistStep = {
  id: string;
  phase_key: string;
  category_key: string;
  title_id: string;
  title_en: string;
  summary_id: string | null;
  summary_en: string | null;
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  sort_order: number;
};

export type CityCostOverride = {
  step_id: string;
  city: string;
  cost_min: number;
  cost_max: number;
};

// A trip-level (`traveler_id` null) trip_step_progress row.
export type StepProgress = {
  step_id: string;
  status: StepStatus;
};

export type CategoryGroup<T = ChecklistStep> = { key: string; steps: T[] };
export type PhaseGroup<T = ChecklistStep> = {
  key: string;
  categories: CategoryGroup<T>[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isStepStatus(value: unknown): value is StepStatus {
  return stepStatuses.includes(value as StepStatus);
}

function compareSteps(a: ChecklistStep, b: ChecklistStep) {
  return a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

// Groups by key in order of first appearance; input must already be sorted.
function groupBy<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(key(item));
    if (list) list.push(item);
    else groups.set(key(item), [item]);
  }
  return [...groups];
}

// Phase → category → steps. Phases and categories are ordered by their
// smallest sort_order, steps by sort_order then id.
export function groupSteps<T extends ChecklistStep>(
  steps: T[],
): PhaseGroup<T>[] {
  const sorted = [...steps].sort(compareSteps);
  return groupBy(sorted, (step) => step.phase_key).map(([key, phaseSteps]) => ({
    key,
    categories: groupBy(phaseSteps, (step) => step.category_key).map(
      ([categoryKey, categorySteps]) => ({
        key: categoryKey,
        steps: categorySteps,
      }),
    ),
  }));
}

// A step without a trip-level progress row has not been started.
export function stepStatus(
  stepId: string,
  progress: StepProgress[],
): StepStatus {
  return progress.find((row) => row.step_id === stepId)?.status ?? "not_started";
}

export function computeProgress(
  steps: ChecklistStep[],
  progress: StepProgress[],
) {
  const total = steps.length;
  const done = steps.filter(
    (step) => stepStatus(step.id, progress) === "completed",
  ).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

export type CostRange = { min: number | null; max: number | null };

// The override for the trip's departure city (exact match) wins over the
// step's own range.
export function resolveCost(
  step: Pick<ChecklistStep, "id" | "estimated_cost_min" | "estimated_cost_max">,
  overrides: CityCostOverride[],
  departureCity: string,
): CostRange {
  const override = overrides.find(
    (row) => row.step_id === step.id && row.city === departureCity,
  );
  return override
    ? { min: override.cost_min, max: override.cost_max }
    : { min: step.estimated_cost_min, max: step.estimated_cost_max };
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number) {
  return rupiah.format(amount);
}

// Message key under `Checklist.cost` plus its values; the caller translates.
export type CostText =
  | { key: "range"; values: { min: string; max: string } }
  | { key: "from"; values: { min: string } }
  | { key: "upTo"; values: { max: string } }
  | { key: "single"; values: { amount: string } }
  | { key: "none"; values: Record<string, never> };

export function costText({ min, max }: CostRange): CostText {
  if (min === null) {
    return max === null
      ? { key: "none", values: {} }
      : { key: "upTo", values: { max: formatRupiah(max) } };
  }
  if (max === null) return { key: "from", values: { min: formatRupiah(min) } };
  if (min === max) {
    return { key: "single", values: { amount: formatRupiah(min) } };
  }
  return {
    key: "range",
    values: { min: formatRupiah(min), max: formatRupiah(max) },
  };
}
