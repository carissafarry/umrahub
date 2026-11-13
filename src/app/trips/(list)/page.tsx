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
export default async function TripsPage() {
  const { trips, steps, ...tracking } = await loadDashboard();
  if (trips.length === 0) redirect("/onboarding");

  const t = await getTranslations("Dashboard");
  const tOnboarding = await getTranslations("Onboarding");
  const atLimit = trips.length >= maxTripsPerUser;

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      {/* The create CTA (or the limit note) comes after the cards on phones
          and is placed beside the title from lg up. */}
      <main className="grid gap-5 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:grid-cols-[1fr_auto] lg:items-end lg:gap-x-10 lg:gap-y-8 lg:pt-8 lg:pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-[2rem] leading-tight font-extrabold tracking-[-0.03em] lg:text-5xl">
            {t("title")}
          </h1>
          <p className="text-muted lg:text-lg">{t("intro")}</p>
        </div>

        <ul className="grid gap-4 md:grid-cols-2 lg:col-span-2 lg:grid-cols-3 lg:gap-6">
          {summarizeTrips(trips, steps, tracking).map((trip, index) => (
            <TripCard key={trip.id} trip={trip} isActive={index === 0} />
          ))}
        </ul>

        {atLimit ? (
          <p className="text-muted lg:col-start-2 lg:row-start-1 lg:max-w-sm">
            {tOnboarding("errors.limit")}
          </p>
        ) : (
          <ButtonLink
            href="/trips/new"
            className="md:justify-self-start lg:col-start-2 lg:row-start-1"
          >
            {t("create")}
          </ButtonLink>
        )}
      </main>
      <AppBottomNav activeHref="/trips" />
    </div>
  );
}
