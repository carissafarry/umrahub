import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistStep, TrackedStep } from "@/lib/trips/checklist";
import type {
  DashboardTrip,
  TripStepConfig,
  TripStepProgress,
  TripTraveler,
} from "./summary";

// Loads what /dashboard and /trips need under the user's RLS: the user's
// profile (name, avatar), the user's trips (newest first, display columns
// only), the published steps once, and the configs, travelers (ids only,
// never the minor or disability fields) and all progress rows of those trips,
// one query each. Signed out → redirect to `/`.
export async function loadDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const profile = getUserProfile(user);

  const { data: trips, error: tripsError } = await supabase
    .from("trips")
    .select("id, name, departure_city, planned_departure_date")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .overrideTypes<DashboardTrip[], { merge: false }>();
  if (tripsError) throw new Error("Failed to load trips");
  if (!trips || trips.length === 0) {
    return {
      profile,
      trips: [],
      steps: [],
      configs: [],
      travelers: [],
      progress: [],
    };
  }

  const tripIds = trips.map((trip) => trip.id);
  const [steps, configs, travelers, progress] = await Promise.all([
    supabase
      .from("preparation_steps")
      .select(
        "id, phase_key, category_key, title_id, title_en, summary_id, summary_en, estimated_cost_min, estimated_cost_max, sort_order, is_shared_step",
      )
      .eq("is_published", true)
      .order("sort_order")
      .overrideTypes<(ChecklistStep & TrackedStep)[], { merge: false }>(),
    supabase
      .from("trip_step_config")
      .select("trip_id, step_id, tracking_mode")
      .in("trip_id", tripIds)
      .overrideTypes<TripStepConfig[], { merge: false }>(),
    supabase
      .from("travelers")
      .select("id, trip_id")
      .in("trip_id", tripIds)
      .overrideTypes<TripTraveler[], { merge: false }>(),
    supabase
      .from("trip_step_progress")
      .select("trip_id, step_id, traveler_id, status")
      .in("trip_id", tripIds)
      .overrideTypes<TripStepProgress[], { merge: false }>(),
  ]);
  if (steps.error || configs.error || travelers.error || progress.error) {
    throw new Error("Failed to load trip progress");
  }

  return {
    profile,
    trips,
    steps: steps.data ?? [],
    configs: configs.data ?? [],
    travelers: travelers.data ?? [],
    progress: progress.data ?? [],
  };
}
