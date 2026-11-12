import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import type { TripSummary } from "@/lib/dashboard/summary";
import { TripActions } from "./TripActions";
import { TripProgress } from "./TripProgress";

// One trip on /trips: name (links to its checklist), city, planned month,
// progress and the rename/delete controls.
export async function TripCard({ trip }: { trip: TripSummary }) {
  const t = await getTranslations("Dashboard");
  const format = await getFormatter();

  return (
    <Card as="li" className="flex flex-col gap-4 lg:p-7">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-xl font-semibold">
            <Link
              href={`/trips/${trip.id}`}
              className="tap-target inline-flex items-center break-words underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {trip.name}
            </Link>
          </h2>
          <TripActions tripId={trip.id} name={trip.name} />
        </div>
        <p className="text-muted">
          {t("departureCity", { city: trip.departure_city })}
        </p>
        {trip.planned_departure_date && (
          <p className="text-muted">
            {t("departureMonth", {
              date: format.dateTime(new Date(trip.planned_departure_date), {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }),
            })}
          </p>
        )}
      </div>

      <TripProgress trip={trip} className="mt-auto" />
    </Card>
  );
}
