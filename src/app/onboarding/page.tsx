import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { findLatestTripId } from "@/lib/onboarding/createTrip";
import { localIsoDate } from "@/lib/onboarding/dates";
import { OnboardingWizard } from "./OnboardingWizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Onboarding");
  return { title: t("metaTitle") };
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Users who already have a trip go to their dashboard instead.
  const latest = await findLatestTripId(supabase, user.id);
  if (latest.ok && latest.tripId) redirect("/dashboard");

  // The server clock sets the first selectable day, matching validation.
  return (
    <OnboardingWizard
      variant="onboarding"
      today={localIsoDate(new Date())}
    />
  );
}
