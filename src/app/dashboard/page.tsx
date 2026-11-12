import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Beranda } from "@/components/dashboard/Beranda";
import { nextTasks } from "@/lib/dashboard/nextTasks";
import { loadDashboard } from "@/lib/dashboard/queries";
import { summarizeTrips } from "@/lib/dashboard/summary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Beranda");
  return { title: t("metaTitle") };
}

// The Beranda for the newest trip. Users without a trip get the onboarding
// wizard.
export default async function BerandaPage() {
  const { profile, trips, steps, ...tracking } = await loadDashboard();
  if (trips.length === 0) redirect("/onboarding");

  const [active] = summarizeTrips(trips.slice(0, 1), steps, tracking);

  return (
    <Beranda
      firstName={profile.name.trim().split(/\s+/)[0]}
      active={active}
      travelerCount={
        tracking.travelers.filter((traveler) => traveler.trip_id === active.id)
          .length
      }
      tasks={nextTasks(active.id, steps, tracking)}
    />
  );
}
