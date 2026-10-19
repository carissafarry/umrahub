"use server";

import { redirect } from "next/navigation";
import type { OnboardingActionResult } from "@/app/onboarding/actions";
import { maxTripsPerUser } from "@/lib/dashboard/validate";
import { createOnboardingTrip } from "@/lib/onboarding/createTrip";
import { defaultTripName } from "@/lib/onboarding/tripName";
import { parseOnboardingInput } from "@/lib/onboarding/validate";
import { createClient } from "@/lib/supabase/server";

// Creates another trip for a user who may already have some, up to the
// app-level cap of `maxTripsPerUser`.
export async function createAdditionalTrip(
  raw: unknown,
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const parsed = parseOnboardingInput(raw);
  if (!parsed.ok) return { error: "invalid" };
  const input = parsed.value;

  const { count, error } = await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (error || count === null) {
    console.error("New trip: trip count failed", error?.code ?? "unknown");
    return { error: "failed" };
  }
  if (count >= maxTripsPerUser) return { error: "limit" };

  const result = await createOnboardingTrip(
    supabase,
    input,
    await defaultTripName(input),
  );
  if (!result.ok) return { error: "failed" };
  redirect(`/trips/${result.tripId}`);
}
