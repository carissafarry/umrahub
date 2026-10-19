import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  costText,
  isUuid,
  resolveCost,
  stepStatus,
  type CityCostOverride,
  type StepProgress,
  type StepStatus,
} from "@/lib/trips/checklist";
import type { ChecklistTrip } from "@/lib/trips/queries";

export type DetailStep = {
  id: string;
  title_id: string;
  title_en: string;
  summary_id: string | null;
  summary_en: string | null;
  detail_content_id: string | null;
  detail_content_en: string | null;
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  cost_varies_by_city: boolean;
  dependency_step_ids: string[] | null;
};

type PrerequisiteRow = {
  id: string;
  title_id: string;
  title_en: string;
  sort_order: number;
};

// `status` is null when no trip was loaded.
export type Prerequisite = PrerequisiteRow & { status: StepStatus | null };

const noRows = { data: [], error: null };

// Loads everything /steps/[id] needs under the user's RLS. Signed out →
// redirect to `/`; bad id or an unpublished/missing step → 404. A `trip`
// param that isn't a UUID or isn't the user's trip is treated as no trip, so
// the page never reveals whether that trip exists.
export async function loadStepDetail(
  stepId: string,
  tripParam: string | undefined,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  if (!isUuid(stepId)) notFound();

  const [stepResult, tripResult] = await Promise.all([
    supabase
      .from("preparation_steps")
      .select(
        "id, title_id, title_en, summary_id, summary_en, detail_content_id, detail_content_en, estimated_cost_min, estimated_cost_max, cost_varies_by_city, dependency_step_ids",
      )
      .eq("id", stepId)
      .eq("is_published", true)
      .maybeSingle<DetailStep>(),
    isUuid(tripParam)
      ? supabase
          .from("trips")
          .select("id, name, departure_city")
          .eq("id", tripParam)
          .maybeSingle<ChecklistTrip>()
      : { data: null, error: null },
  ]);
  const loadError = stepResult.error ?? tripResult.error;
  if (loadError) throw new Error("Failed to load step", { cause: loadError });
  const step = stepResult.data;
  if (!step) notFound();
  const trip = tripResult.data;

  const dependencyIds = step.dependency_step_ids ?? [];
  const [overrides, progress, prerequisites] = await Promise.all([
    trip
      ? supabase
          .from("city_cost_overrides")
          .select("step_id, city, cost_min, cost_max")
          .eq("step_id", step.id)
          .eq("city", trip.departure_city)
          .overrideTypes<CityCostOverride[], { merge: false }>()
      : noRows,
    trip && dependencyIds.length > 0
      ? supabase
          .from("trip_step_progress")
          .select("step_id, status")
          .eq("trip_id", trip.id)
          .is("traveler_id", null)
          .in("step_id", dependencyIds)
          .overrideTypes<StepProgress[], { merge: false }>()
      : noRows,
    dependencyIds.length > 0
      ? supabase
          .from("preparation_steps")
          .select("id, title_id, title_en, sort_order")
          .in("id", dependencyIds)
          .eq("is_published", true)
          .order("sort_order")
          .overrideTypes<PrerequisiteRow[], { merge: false }>()
      : noRows,
  ]);
  const error = overrides.error ?? progress.error ?? prerequisites.error;
  if (error) throw new Error("Failed to load step details", { cause: error });

  return {
    step,
    trip,
    cost: costText(
      resolveCost(step, overrides.data ?? [], trip?.departure_city ?? ""),
    ),
    prerequisites: (prerequisites.data ?? []).map(
      (row): Prerequisite => ({
        ...row,
        status: trip ? stepStatus(row.id, progress.data ?? []) : null,
      }),
    ),
  };
}
