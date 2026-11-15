"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/trips/checklist";
import {
  nextStatus,
  parseSeats,
  type OptionResponse,
  type ParticipationStatus,
} from "./transitions";

export type ParticipationResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "notFound" | "notAllowed" | "failed" };

type Participation = {
  id: string;
  trip_id: string;
  schedule_id: string;
  status: ParticipationStatus;
  seats: number;
};

// Logs a fixed message plus the Postgres error code only.
function logFailure(stage: string, error: { code?: string } | null) {
  console.error(`Participation: ${stage} failed`, error?.code ?? "unknown");
}

function revalidate(scheduleId: string) {
  revalidatePath(`/jadwal/${scheduleId}`);
  revalidatePath("/jadwal");
}

// Loads the participation the signed-in user may see (RLS limits it to their
// trips). `notFound` covers "missing" and "someone else's" alike.
async function loadParticipation(
  participationId: string,
): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; row: Participation }
  | { ok: false; error: "notFound" | "failed" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "failed" };

  const { data, error } = await supabase
    .from("participations")
    .select("id, trip_id, schedule_id, status, seats")
    .eq("id", participationId)
    .maybeSingle<Participation>();
  if (error) {
    logFailure("participation lookup", error);
    return { ok: false, error: "failed" };
  }
  if (!data) return { ok: false, error: "notFound" };
  return { ok: true, supabase, row: data };
}

// Writes `values` on the row only while it still has the status that was read.
async function updateParticipation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Participation,
  values: { seats?: number; status?: ParticipationStatus },
): Promise<ParticipationResult> {
  const { error } = await supabase
    .from("participations")
    .update(values)
    .eq("id", row.id)
    .eq("status", row.status);
  if (error) {
    logFailure("participation update", error);
    return { ok: false, error: "failed" };
  }
  revalidate(row.schedule_id);
  return { ok: true };
}

export async function expressInterest(
  tripId: string,
  scheduleId: string,
  seats: number,
): Promise<ParticipationResult> {
  if (!isUuid(tripId) || !isUuid(scheduleId)) {
    return { ok: false, error: "invalid" };
  }
  const parsed = parseSeats(seats);
  if (!parsed.ok) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "failed" };

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .maybeSingle();
  if (tripError) {
    logFailure("trip lookup", tripError);
    return { ok: false, error: "failed" };
  }
  if (!trip) return { ok: false, error: "notFound" };

  const { data: existing, error: lookupError } = await supabase
    .from("participations")
    .select("id, trip_id, schedule_id, status, seats")
    .eq("trip_id", tripId)
    .eq("schedule_id", scheduleId)
    .maybeSingle<Participation>();
  if (lookupError) {
    logFailure("participation lookup", lookupError);
    return { ok: false, error: "failed" };
  }

  const status = nextStatus("expressInterest", existing?.status ?? null);
  if (!status) return { ok: false, error: "notAllowed" };

  if (existing) {
    return updateParticipation(supabase, existing, {
      status,
      seats: parsed.seats,
    });
  }

  const { error } = await supabase
    .from("participations")
    .insert({ trip_id: tripId, schedule_id: scheduleId, seats: parsed.seats });
  if (error) {
    // Lost a race with another insert for the same trip and schedule.
    if (error.code === "23505") return { ok: false, error: "notAllowed" };
    logFailure("participation insert", error);
    return { ok: false, error: "failed" };
  }

  revalidate(scheduleId);
  return { ok: true };
}

export async function setSeats(
  participationId: string,
  seats: number,
): Promise<ParticipationResult> {
  if (!isUuid(participationId)) return { ok: false, error: "invalid" };
  const parsed = parseSeats(seats);
  if (!parsed.ok) return { ok: false, error: "invalid" };

  const loaded = await loadParticipation(participationId);
  if (!loaded.ok) return loaded;

  if (!nextStatus("setSeats", loaded.row.status)) {
    return { ok: false, error: "notAllowed" };
  }
  return updateParticipation(loaded.supabase, loaded.row, {
    seats: parsed.seats,
  });
}

export async function confirmAttendance(
  participationId: string,
): Promise<ParticipationResult> {
  if (!isUuid(participationId)) return { ok: false, error: "invalid" };

  const loaded = await loadParticipation(participationId);
  if (!loaded.ok) return loaded;

  const status = nextStatus("confirmAttendance", loaded.row.status);
  if (!status) return { ok: false, error: "notAllowed" };
  return updateParticipation(loaded.supabase, loaded.row, { status });
}

export async function respondToOption(
  participationId: string,
  response: OptionResponse,
): Promise<ParticipationResult> {
  if (!isUuid(participationId)) return { ok: false, error: "invalid" };
  if (response !== "accept" && response !== "decline") {
    return { ok: false, error: "invalid" };
  }

  const loaded = await loadParticipation(participationId);
  if (!loaded.ok) return loaded;

  const status = nextStatus("respondToOption", loaded.row.status, response);
  if (!status) return { ok: false, error: "notAllowed" };
  // Accepting keeps the status: nothing to write.
  if (status === loaded.row.status) {
    revalidate(loaded.row.schedule_id);
    return { ok: true };
  }
  return updateParticipation(loaded.supabase, loaded.row, { status });
}

export async function cancelInterest(
  participationId: string,
): Promise<ParticipationResult> {
  if (!isUuid(participationId)) return { ok: false, error: "invalid" };

  const loaded = await loadParticipation(participationId);
  if (!loaded.ok) return loaded;

  const status = nextStatus("cancelInterest", loaded.row.status);
  if (!status) return { ok: false, error: "notAllowed" };

  // No cancelling once a payment proof exists, whatever the status says.
  const { data: proofs, error: proofError } = await loaded.supabase
    .from("payment_proofs")
    .select("id")
    .eq("participation_id", participationId)
    .limit(1);
  if (proofError) {
    logFailure("payment proof lookup", proofError);
    return { ok: false, error: "failed" };
  }
  if (proofs && proofs.length > 0) return { ok: false, error: "notAllowed" };

  return updateParticipation(loaded.supabase, loaded.row, { status });
}
