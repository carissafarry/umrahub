import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BudgetStep, StepConfig } from "./budget";
import {
  isUuid,
  type ChecklistStep,
  type CityCostOverride,
  type StepProgress,
} from "./checklist";

export type ChecklistTrip = {
  id: string;
  name: string;
  departure_city: string;
};

const stepColumns =
  "id, phase_key, category_key, title_id, title_en, summary_id, summary_en, estimated_cost_min, estimated_cost_max, sort_order";

// Signed out → redirect to `/`; bad id or a trip that isn't the user's (RLS
// returns no row) → 404.
async function loadOwnedTrip(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  if (!isUuid(id)) notFound();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, name, departure_city")
    .eq("id", id)
    .maybeSingle<ChecklistTrip>();
  if (tripError) throw new Error("Failed to load trip", { cause: tripError });
  if (!trip) notFound();

  return { supabase, trip };
}

// Loads everything /trips/[id] needs under the user's RLS.
export async function loadTripChecklist(id: string) {
  const { supabase, trip } = await loadOwnedTrip(id);

  const [steps, overrides, progress] = await Promise.all([
    supabase
      .from("preparation_steps")
      .select(stepColumns)
      .eq("is_published", true)
      .order("sort_order")
      .overrideTypes<ChecklistStep[], { merge: false }>(),
    supabase
      .from("city_cost_overrides")
      .select("step_id, city, cost_min, cost_max")
      .eq("city", trip.departure_city)
      .overrideTypes<CityCostOverride[], { merge: false }>(),
    supabase
      .from("trip_step_progress")
      .select("step_id, status")
      .eq("trip_id", trip.id)
      .is("traveler_id", null)
      .overrideTypes<StepProgress[], { merge: false }>(),
  ]);
  const error = steps.error ?? overrides.error ?? progress.error;
  if (error) throw new Error("Failed to load checklist", { cause: error });

  return {
    trip,
    steps: steps.data ?? [],
    overrides: overrides.data ?? [],
    progress: progress.data ?? [],
  };
}

// Loads everything /trips/[id]/budget needs under the user's RLS.
export async function loadTripBudget(id: string) {
  const { supabase, trip } = await loadOwnedTrip(id);

  const [steps, overrides, configs, travelers] = await Promise.all([
    supabase
      .from("preparation_steps")
      .select(`${stepColumns}, is_shared_step`)
      .eq("is_published", true)
      .order("sort_order")
      .overrideTypes<BudgetStep[], { merge: false }>(),
    supabase
      .from("city_cost_overrides")
      .select("step_id, city, cost_min, cost_max")
      .eq("city", trip.departure_city)
      .overrideTypes<CityCostOverride[], { merge: false }>(),
    supabase
      .from("trip_step_config")
      .select("step_id, tracking_mode")
      .eq("trip_id", trip.id)
      .overrideTypes<StepConfig[], { merge: false }>(),
    supabase
      .from("travelers")
      .select("id")
      .eq("trip_id", trip.id)
      .overrideTypes<{ id: string }[], { merge: false }>(),
  ]);
  const error =
    steps.error ?? overrides.error ?? configs.error ?? travelers.error;
  if (error) throw new Error("Failed to load budget", { cause: error });

  return {
    trip,
    steps: steps.data ?? [],
    overrides: overrides.data ?? [],
    configs: configs.data ?? [],
    travelers: travelers.data ?? [],
  };
}
