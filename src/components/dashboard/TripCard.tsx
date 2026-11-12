import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import type { TripSummary } from "@/lib/dashboard/summary";
import { TripActions } from "./TripActions";
import { TripProgress } from "./TripProgress";

// One trip on /trips: the "Trip aktif" tag on the newest one, name (links to
// its checklist), a meta line of city and planned month, the rename/delete
// controls and progress.
export async function TripCard({
  trip,
  isActive = false,
}: {
  trip: TripSummary;
  isActive?: boolean;
}) {
  const t = await getTranslations("Dashboard");
  const tBeranda = await getTranslations("Beranda");
  const format = await getFormatter();

  return (
    <Card as="li" className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          {isActive && (
            <span className="mb-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
              {tBeranda("activeTrip")}
            </span>
          )}
          <h2 className="max-w-full text-lg font-bold tracking-tight lg:text-xl">
            <Link
              href={`/trips/${trip.id}`}
              className="tap-target inline-flex max-w-full items-center break-words underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {trip.name}
            </Link>
          </h2>
          <p className="text-xs font-medium text-muted">
            {t("departureCity", { city: trip.departure_city })}
            {trip.planned_departure_date &&
              ` · ${t("departureMonth", {
                date: format.dateTime(new Date(trip.planned_departure_date), {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }),
              })}`}
          </p>
        </div>
        <TripActions tripId={trip.id} name={trip.name} />
      </div>

      <TripProgress trip={trip} className="mt-auto" />
    </Card>
  );
}
