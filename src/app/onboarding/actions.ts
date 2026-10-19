"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createOnboardingTrip,
  findLatestTripId,
} from "@/lib/onboarding/createTrip";
import { defaultTripName } from "@/lib/onboarding/tripName";
import { parseOnboardingInput } from "@/lib/onboarding/validate";

export type OnboardingActionResult = { error: "invalid" | "failed" | "limit" };

export async function createTripFromOnboarding(
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

  const existing = await findLatestTripId(supabase, user.id);
  if (!existing.ok) return { error: "failed" };
  if (existing.tripId) redirect("/dashboard");

  const result = await createOnboardingTrip(
    supabase,
    input,
    await defaultTripName(input),
  );
  if (!result.ok) return { error: "failed" };
  redirect(`/trips/${result.tripId}`);
}
