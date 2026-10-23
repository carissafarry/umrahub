import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppBottomNav } from "@/components/AppNav";
import { TripCard } from "@/components/dashboard/TripCard";
import { ButtonLink } from "@/components/ui/Button";
import { loadDashboard } from "@/lib/dashboard/queries";
import { summarizeTrips } from "@/lib/dashboard/summary";
import { maxTripsPerUser } from "@/lib/dashboard/validate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("metaTitle") };
}

// The signed-in user's trips. Users without one get the onboarding wizard.
export default async function DashboardPage() {
  const { trips, steps, ...tracking } = await loadDashboard();
  if (trips.length === 0) redirect("/onboarding");

  const t = await getTranslations("Dashboard");
  const tOnboarding = await getTranslations("Onboarding");
  const atLimit = trips.length >= maxTripsPerUser;

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-col gap-6 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:gap-8 lg:pt-8 lg:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="text-lg text-muted">{t("intro")}</p>
          </div>
          {atLimit ? (
            <p className="text-muted lg:max-w-sm">
              {tOnboarding("errors.limit")}
            </p>
          ) : (
            <ButtonLink href="/trips/new" className="lg:shrink-0">
              {t("create")}
            </ButtonLink>
          )}
        </div>

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {summarizeTrips(trips, steps, tracking).map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </ul>
      </main>
      <AppBottomNav activeHref="/dashboard" />
    </div>
  );
}
