"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/trips/checklist";
import { parseTripName } from "./validate";

export type RenameTripResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "failed" };

export type DeleteTripResult = { ok: true } | { ok: false };

// Logs a fixed message plus the Postgres error code only.
function logFailure(stage: string, error: { code?: string } | null) {
  console.error(`Dashboard: ${stage} failed`, error?.code ?? "unknown");
}

// The signed-in user's id when they own the trip, else null. RLS is the
// second line of defence.
async function ownTrip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: trip, error } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    logFailure("trip lookup", error);
    return null;
  }
  return trip ? user.id : null;
}

export async function renameTrip(
  tripId: string,
  name: string,
): Promise<RenameTripResult> {
  const parsed = parseTripName(name);
  if (!isUuid(tripId) || !parsed.ok) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const userId = await ownTrip(supabase, tripId);
  if (!userId) return { ok: false, error: "failed" };

  const { error } = await supabase
    .from("trips")
    .update({ name: parsed.value })
    .eq("id", tripId)
    .eq("user_id", userId);
  if (error) {
    logFailure("trip rename", error);
    return { ok: false, error: "failed" };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

// The database `on delete cascade` removes the trip's child rows.
export async function deleteTrip(tripId: string): Promise<DeleteTripResult> {
  if (!isUuid(tripId)) return { ok: false };

  const supabase = await createClient();
  const userId = await ownTrip(supabase, tripId);
  if (!userId) return { ok: false };

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", userId);
  if (error) {
    logFailure("trip delete", error);
    return { ok: false };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
