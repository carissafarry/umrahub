import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OnboardingWizard } from "@/app/onboarding/OnboardingWizard";
import { AppBottomNav } from "@/components/AppNav";
import { currentYearMonth } from "@/lib/onboarding/validate";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.newTrip");
  return { title: t("metaTitle") };
}

// The onboarding wizard again, for users who want another trip.
export default async function NewTripPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <>
      <OnboardingWizard
        variant="newTrip"
        firstMonth={currentYearMonth(new Date())}
      />
      <AppBottomNav activeHref="/trips/new" />
    </>
  );
}
