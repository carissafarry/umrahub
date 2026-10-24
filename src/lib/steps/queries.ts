import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  costText,
  isUuid,
  resolveCost,
  stepStatus,
  type CityCostOverride,
  type StepConfig,
  type StepProgress,
  type StepStatus,
} from "@/lib/trips/checklist";
import type { ChecklistTrip } from "@/lib/trips/queries";
import type { StepComment } from "./comments";

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
  is_shared_step: boolean;
};

// `status` is null when no trip was loaded; per-traveler prerequisites show
// their aggregate status, like the checklist.
export type Prerequisite = Omit<PrerequisiteRow, "is_shared_step"> & {
  status: StepStatus | null;
};

type CommentRow = {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
};

// The page shows the newest comments only; there is no pagination.
const commentLimit = 50;

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
  const tracksPrerequisites = trip !== null && dependencyIds.length > 0;
  const [overrides, configs, travelers, progress, prerequisites, comments] =
    await Promise.all([
      trip
        ? supabase
            .from("city_cost_overrides")
            .select("step_id, city, cost_min, cost_max")
            .eq("step_id", step.id)
            .eq("city", trip.departure_city)
            .overrideTypes<CityCostOverride[], { merge: false }>()
        : noRows,
      tracksPrerequisites
        ? supabase
            .from("trip_step_config")
            .select("step_id, tracking_mode")
            .eq("trip_id", trip.id)
            .overrideTypes<StepConfig[], { merge: false }>()
        : noRows,
      tracksPrerequisites
        ? supabase
            .from("travelers")
            .select("id")
            .eq("trip_id", trip.id)
            .overrideTypes<{ id: string }[], { merge: false }>()
        : noRows,
      tracksPrerequisites
        ? supabase
            .from("trip_step_progress")
            .select("step_id, traveler_id, status")
            .eq("trip_id", trip.id)
            .in("step_id", dependencyIds)
            .overrideTypes<StepProgress[], { merge: false }>()
        : noRows,
      dependencyIds.length > 0
        ? supabase
            .from("preparation_steps")
            .select("id, title_id, title_en, sort_order, is_shared_step")
            .in("id", dependencyIds)
            .eq("is_published", true)
            .order("sort_order")
            .overrideTypes<PrerequisiteRow[], { merge: false }>()
        : noRows,
      supabase
        .from("step_comments")
        .select(
          "id, user_id, author_name, author_avatar_url, content, created_at",
        )
        .eq("step_id", step.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(commentLimit)
        .overrideTypes<CommentRow[], { merge: false }>(),
    ]);
  const error =
    overrides.error ??
    configs.error ??
    travelers.error ??
    progress.error ??
    prerequisites.error ??
    comments.error;
  if (error) throw new Error("Failed to load step details", { cause: error });
  const tracking = {
    configs: configs.data ?? [],
    travelerIds: (travelers.data ?? []).map((traveler) => traveler.id),
    progress: progress.data ?? [],
  };

  return {
    step,
    trip,
    cost: costText(
      resolveCost(step, overrides.data ?? [], trip?.departure_city ?? ""),
    ),
    prerequisites: (prerequisites.data ?? []).map(
      ({ is_shared_step, ...row }): Prerequisite => ({
        ...row,
        status: trip
          ? stepStatus({ id: row.id, is_shared_step }, tracking)
          : null,
      }),
    ),
    comments: (comments.data ?? []).map(
      (row): StepComment => ({
        id: row.id,
        authorName: row.author_name,
        authorAvatarUrl: row.author_avatar_url,
        content: row.content,
        createdAt: row.created_at,
        isOwn: row.user_id === user.id,
      }),
    ),
  };
}
