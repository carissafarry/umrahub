import { getTranslations } from "next-intl/server";
import type { TripSummary } from "@/lib/dashboard/summary";

// Progress text and bar of one trip, shared by TripCard and the Beranda.
export async function TripProgress({
  trip,
  className = "",
}: {
  trip: TripSummary;
  className?: string;
}) {
  const t = await getTranslations("Dashboard");
  const { done, total, percent } = trip.progress;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-muted">{t("progressText", { done, total })}</p>
        <p className="text-lg font-bold">{t("progressPercent", { percent })}</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t("progressLabel", { name: trip.name })}
        className="h-3 overflow-hidden rounded-full bg-tile-violet"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
