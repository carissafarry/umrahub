"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStepStatus, isUuid } from "./checklist";

export type UpdateStepStatusResult = { ok: true } | { ok: false };

// Sets the trip-level (`traveler_id` null) status of one step. Ownership is
// re-checked here; RLS is the second line of defence.
export async function updateStepStatus(
  tripId: string,
  stepId: string,
  status: string,
): Promise<UpdateStepStatusResult> {
  if (!isUuid(tripId) || !isUuid(stepId) || !isStepStatus(status)) {
    return { ok: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (tripError || !trip) return { ok: false };

  const { data: step, error: stepError } = await supabase
    .from("preparation_steps")
    .select("id")
    .eq("id", stepId)
    .eq("is_published", true)
    .maybeSingle();
  if (stepError || !step) return { ok: false };

  const { error } = await supabase.from("trip_step_progress").upsert(
    {
      trip_id: tripId,
      step_id: stepId,
      traveler_id: null,
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    },
    { onConflict: "trip_id,step_id,traveler_id" },
  );
  if (error) return { ok: false };

  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}
