"use server";

import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  createOnboardingTrip,
  findLatestTripId,
} from "@/lib/onboarding/createTrip";
import { parseOnboardingInput } from "@/lib/onboarding/validate";

export type OnboardingActionResult = { error: "invalid" | "failed" };

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
  if (existing.tripId) redirect(`/trips/${existing.tripId}`);

  const t = await getTranslations("Onboarding");
  const format = await getFormatter();
  const name = t("defaultTripName", {
    month: format.dateTime(new Date(Date.UTC(input.year, input.month - 1, 1)), {
      month: "long",
      timeZone: "UTC",
    }),
    // A string, so ICU doesn't group it as a number ("2.027").
    year: String(input.year),
  });

  const result = await createOnboardingTrip(supabase, input, name);
  if (!result.ok) return { error: "failed" };
  redirect(`/trips/${result.tripId}`);
}
