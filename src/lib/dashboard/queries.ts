import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistStep } from "@/lib/trips/checklist";
import type { DashboardTrip, TripStepProgress } from "./summary";

// Loads what /dashboard needs under the user's RLS: the user's trips (newest
// first, display columns only), the published steps once and the trip-level
// progress of all those trips in one query. Signed out → redirect to `/`.
export async function loadDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: trips, error: tripsError } = await supabase
    .from("trips")
    .select("id, name, departure_city, planned_departure_date")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .overrideTypes<DashboardTrip[], { merge: false }>();
  if (tripsError) throw new Error("Failed to load trips");
  if (!trips || trips.length === 0) return { trips: [], steps: [], progress: [] };

  const [steps, progress] = await Promise.all([
    supabase
      .from("preparation_steps")
      .select(
        "id, phase_key, category_key, title_id, title_en, summary_id, summary_en, estimated_cost_min, estimated_cost_max, sort_order",
      )
      .eq("is_published", true)
      .order("sort_order")
      .overrideTypes<ChecklistStep[], { merge: false }>(),
    supabase
      .from("trip_step_progress")
      .select("trip_id, step_id, status")
      .in(
        "trip_id",
        trips.map((trip) => trip.id),
      )
      .is("traveler_id", null)
      .overrideTypes<TripStepProgress[], { merge: false }>(),
  ]);
  if (steps.error || progress.error) {
    throw new Error("Failed to load trip progress");
  }

  return { trips, steps: steps.data ?? [], progress: progress.data ?? [] };
}
