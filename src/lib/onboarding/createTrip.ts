import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingInput } from "./validate";

// Seed step 01 "Apply for or renew your passport" (individual step).
export const passportStepId = "5eed0000-0000-4000-8000-000000000001";

export type CreateTripResult =
  | { ok: true; tripId: string }
  | { ok: false; error: "create_failed" };

const failed = { ok: false, error: "create_failed" } as const;

// Logs a fixed message plus the Postgres error code only: messages and
// details can contain the failing row (names, notes).
function logFailure(stage: string, error: { code?: string } | null) {
  console.error(`Onboarding: ${stage} failed`, error?.code ?? "unknown");
}

// Newest trip of the signed-in user, or null when they have none.
export async function findLatestTripId(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; tripId: string | null } | { ok: false }> {
  const { data, error } = await supabase
    .from("trips")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    logFailure("trip lookup", error);
    return { ok: false };
  }
  return { ok: true, tripId: data?.[0]?.id ?? null };
}

// Writes the trip, its travelers and, for a valid passport, step 01 progress.
// `user_id` is left to its auth.uid() default; RLS scopes every write.
export async function createOnboardingTrip(
  supabase: SupabaseClient,
  input: OnboardingInput,
  name: string,
  now: Date = new Date(),
): Promise<CreateTripResult> {
  const month = String(input.month).padStart(2, "0");

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      name,
      departure_city: input.city,
      planned_departure_date: `${input.year}-${month}-01`,
      has_disabilities: input.travelers.some((t) => t.hasDisability),
      has_minors: input.travelers.some((t) => t.isMinor),
      disability_notes: input.disabilityNotes,
    })
    .select("id")
    .single();
  if (tripError || !trip) {
    logFailure("trip insert", tripError);
    return failed;
  }

  const tripId: string = trip.id;

  const { data: travelers, error: travelersError } = await supabase
    .from("travelers")
    .insert(
      input.travelers.map((t) => ({
        trip_id: tripId,
        name: t.name,
        is_minor: t.isMinor,
        has_disability: t.hasDisability,
      })),
    )
    .select("id");
  if (travelersError || !travelers) {
    logFailure("travelers insert", travelersError);
    return rollback(supabase, tripId);
  }

  if (input.passport === "valid") {
    const completedAt = now.toISOString();
    const { error: progressError } = await supabase
      .from("trip_step_progress")
      .insert(
        travelers.map((t: { id: string }) => ({
          trip_id: tripId,
          step_id: passportStepId,
          traveler_id: t.id,
          status: "completed",
          completed_at: completedAt,
        })),
      );
    if (progressError) {
      logFailure("passport progress insert", progressError);
      return rollback(supabase, tripId);
    }
  }

  return { ok: true, tripId };
}

// Best-effort cleanup; deleting the trip cascades to its children.
async function rollback(
  supabase: SupabaseClient,
  tripId: string,
): Promise<CreateTripResult> {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) logFailure("trip cleanup", error);
  return failed;
}
