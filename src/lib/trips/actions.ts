"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStepStatus, isTrackingMode, isUuid } from "./checklist";

export type UpdateStepStatusResult = { ok: true } | { ok: false };

export type UpdateStepTrackingModeResult = { ok: true } | { ok: false };

// Signed-in user's Supabase client when they own the trip and the step is
// published, else null.
async function ownedTripStep(tripId: string, stepId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (tripError || !trip) return null;

  const { data: step, error: stepError } = await supabase
    .from("preparation_steps")
    .select("id")
    .eq("id", stepId)
    .eq("is_published", true)
    .maybeSingle();
  if (stepError || !step) return null;

  return supabase;
}

// Sets the status of one step, trip-level when `travelerId` is null, else for
// that traveler of the trip. Ownership is re-checked here; RLS is the second
// line of defence.
export async function updateStepStatus(
  tripId: string,
  stepId: string,
  status: string,
  travelerId: string | null = null,
): Promise<UpdateStepStatusResult> {
  if (
    !isUuid(tripId) ||
    !isUuid(stepId) ||
    !isStepStatus(status) ||
    (travelerId !== null && !isUuid(travelerId))
  ) {
    return { ok: false };
  }

  const supabase = await ownedTripStep(tripId, stepId);
  if (!supabase) return { ok: false };

  if (travelerId !== null) {
    const { data: traveler, error: travelerError } = await supabase
      .from("travelers")
      .select("id")
      .eq("id", travelerId)
      .eq("trip_id", tripId)
      .maybeSingle();
    if (travelerError || !traveler) return { ok: false };
  }

  const { error } = await supabase.from("trip_step_progress").upsert(
    {
      trip_id: tripId,
      step_id: stepId,
      traveler_id: travelerId,
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    },
    { onConflict: "trip_id,step_id,traveler_id" },
  );
  if (error) return { ok: false };

  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

// Switches one step between one trip-level status and one status per
// traveler. Progress rows of both modes are kept, so switching back restores
// them.
export async function updateStepTrackingMode(
  tripId: string,
  stepId: string,
  mode: string,
): Promise<UpdateStepTrackingModeResult> {
  if (!isUuid(tripId) || !isUuid(stepId) || !isTrackingMode(mode)) {
    return { ok: false };
  }

  const supabase = await ownedTripStep(tripId, stepId);
  if (!supabase) return { ok: false };

  const { error } = await supabase
    .from("trip_step_config")
    .upsert(
      { trip_id: tripId, step_id: stepId, tracking_mode: mode },
      { onConflict: "trip_id,step_id" },
    );
  if (error) return { ok: false };

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/budget`);
  return { ok: true };
}
