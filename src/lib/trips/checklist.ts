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

// Any step whose tracking mode can be resolved.
export type TrackedStep = { id: string; is_shared_step: boolean };

// The checklist page also needs each step's prerequisites and default mode.
export type DependentStep = ChecklistStep &
  TrackedStep & {
    dependency_step_ids: string[] | null;
  };

export type CityCostOverride = {
  step_id: string;
  city: string;
  cost_min: number;
  cost_max: number;
};

export const trackingModes = ["shared", "individual"] as const;

export type TrackingMode = (typeof trackingModes)[number];

// A per-trip trip_step_config row; it wins over `is_shared_step`.
export type StepConfig = {
  step_id: string;
  tracking_mode: TrackingMode;
};

// A trip_step_progress row: trip-level when `traveler_id` is null.
export type StepProgress = {
  step_id: string;
  traveler_id: string | null;
  status: StepStatus;
};

// Everything one trip's step statuses are resolved from.
export type TripTracking = {
  configs: StepConfig[];
  travelerIds: string[];
  progress: StepProgress[];
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

export function isTrackingMode(value: unknown): value is TrackingMode {
  return trackingModes.includes(value as TrackingMode);
}

export function compareSteps(
  a: Pick<ChecklistStep, "id" | "sort_order">,
  b: Pick<ChecklistStep, "id" | "sort_order">,
) {
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

export function isIndividual(step: TrackedStep, configs: StepConfig[]) {
  const config = configs.find((row) => row.step_id === step.id);
  return config ? config.tracking_mode === "individual" : !step.is_shared_step;
}

// An individual step on a trip without travelers falls back to the
// trip-level row.
export function isPerTraveler(step: TrackedStep, tracking: TripTracking) {
  return (
    isIndividual(step, tracking.configs) && tracking.travelerIds.length > 0
  );
}

// A step without a matching progress row has not been started. A null
// `travelerId` reads the trip-level row.
export function travelerStatus(
  stepId: string,
  travelerId: string | null,
  progress: StepProgress[],
): StepStatus {
  return (
    progress.find(
      (row) => row.step_id === stepId && row.traveler_id === travelerId,
    )?.status ?? "not_started"
  );
}

// Completed when everyone is done, not started when nobody started,
// otherwise in progress.
export function aggregateStatus(statuses: StepStatus[]): StepStatus {
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.every((status) => status === "not_started")) {
    return "not_started";
  }
  return "in_progress";
}

// The aggregate for a per-traveler step, the trip-level status otherwise.
export function stepStatus(
  step: TrackedStep,
  tracking: TripTracking,
): StepStatus {
  if (!isPerTraveler(step, tracking)) {
    return travelerStatus(step.id, null, tracking.progress);
  }
  return aggregateStatus(
    tracking.travelerIds.map((travelerId) =>
      travelerStatus(step.id, travelerId, tracking.progress),
    ),
  );
}

// Prerequisites of `step` that are not completed yet, in sort_order.
// Dependencies are advisory: unknown ids (unpublished or missing steps) and
// a step listing itself are ignored.
export function incompletePrerequisites<
  T extends TrackedStep & Pick<ChecklistStep, "sort_order">,
>(
  step: Pick<DependentStep, "id" | "dependency_step_ids">,
  steps: T[],
  tracking: TripTracking,
): T[] {
  const ids = new Set(step.dependency_step_ids ?? []);
  ids.delete(step.id);
  return steps
    .filter(
      (other) =>
        ids.has(other.id) && stepStatus(other, tracking) !== "completed",
    )
    .sort(compareSteps);
}

// Counts units: a shared step is one, a per-traveler step one per traveler.
export function computeProgress(steps: TrackedStep[], tracking: TripTracking) {
  let done = 0;
  let total = 0;
  for (const step of steps) {
    const travelerIds = isPerTraveler(step, tracking)
      ? tracking.travelerIds
      : [null];
    for (const travelerId of travelerIds) {
      total += 1;
      if (
        travelerStatus(step.id, travelerId, tracking.progress) === "completed"
      ) {
        done += 1;
      }
    }
  }
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
