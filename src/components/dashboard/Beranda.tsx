import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { AppBottomNav } from "@/components/AppNav";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChecklistIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { TripSummary } from "@/lib/dashboard/summary";
import type { ChecklistStep } from "@/lib/trips/checklist";
import { TripProgress } from "./TripProgress";

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

const taskTiles = [
  "bg-tile-blue text-tile-blue-foreground",
  "bg-tile-amber text-tile-amber-foreground",
  "bg-tile-green text-tile-green-foreground",
];

// Clouds and a mosque silhouette over the sky hero; decorative only.
function HeroArt() {
  return (
    <svg
      viewBox="0 0 390 120"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-30 w-full text-primary-foreground lg:h-44"
    >
      <g fill="currentColor" opacity=".55">
        <ellipse cx="70" cy="86" rx="46" ry="13" />
        <ellipse cx="104" cy="80" rx="32" ry="12" />
        <ellipse cx="300" cy="62" rx="40" ry="11" />
      </g>
      <g fill="currentColor" opacity=".7">
        <path d="M268 120V84c0-14 10-24 24-24s24 10 24 24v36z" />
        <rect x="324" y="68" width="8" height="52" />
        <path d="m322 68 6-12 6 12z" />
        <rect x="252" y="76" width="8" height="44" />
        <path d="m250 76 6-10 6 10z" />
      </g>
    </svg>
  );
}

type BerandaProps = {
  firstName: string;
  // The active (newest) trip with its progress.
  active: TripSummary;
  travelerCount: number;
  // Its next unfinished steps, at most three.
  tasks: Pick<ChecklistStep, "id" | "phase_key" | "title_id" | "title_en">[];
};

// The Beranda body: greeting on a sky hero, the active trip, its next
// unfinished steps and the schedule-search CTA.
export async function Beranda({
  firstName,
  active,
  travelerCount,
  tasks,
}: BerandaProps) {
  const t = await getTranslations("Beranda");
  const tDashboard = await getTranslations("Dashboard");
  const tChecklist = await getTranslations("Checklist");
  const format = await getFormatter();
  const locale = await getLocale();
  // Content added later in Studio may use a phase key without a message yet.
  const phaseLabel = (key: string) =>
    tChecklist.has(`phases.${key}`) ? tChecklist(`phases.${key}`) : key;

  return (
    <div className="mx-auto w-full max-w-md flex-1 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-16">
        <div className="relative h-50 overflow-hidden bg-linear-to-b from-sky-day-from to-sky-day-to px-5 pt-5 md:rounded-t-[2rem] md:px-8 lg:h-64 lg:px-10 lg:pt-10">
          <h1 className="relative z-10 text-[2rem] leading-[1.05] font-semibold tracking-tight break-words text-primary-foreground lg:text-5xl">
            {t("greeting", { name: firstName })}
          </h1>
          <HeroArt />
        </div>

        <div className="relative -mt-7 flex flex-col gap-4 rounded-t-[2rem] bg-background px-4 pt-5 md:px-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:px-8 lg:pt-8">
          <Card className="flex flex-col gap-4 lg:p-7">
            <div className="flex flex-col gap-1">
              <span className="self-start rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
                {t("activeTrip")}
              </span>
              <h2 className="mt-1 min-w-0 text-xl font-bold tracking-tight">
                <Link
                  href={`/trips/${active.id}`}
                  className={`tap-target inline-flex items-center break-words underline-offset-4 hover:underline ${focusRing}`}
                >
                  {active.name}
                </Link>
              </h2>
              <p className="text-sm text-muted">
                {tDashboard("departureCity", { city: active.departure_city })}
              </p>
              {active.planned_departure_date && (
                <p className="text-sm text-muted">
                  {tDashboard("departureMonth", {
                    date: format.dateTime(
                      new Date(active.planned_departure_date),
                      { month: "long", year: "numeric", timeZone: "UTC" },
                    ),
                  })}
                </p>
              )}
              <p className="text-sm text-muted">
                {t("travelers", { count: travelerCount })}
              </p>
            </div>
            <hr className="border-surface-line" />
            <TripProgress trip={active} />
          </Card>

          <section
            aria-labelledby="beranda-tasks"
            className="flex flex-col gap-3"
          >
            <h2
              id="beranda-tasks"
              className="text-lg font-extrabold tracking-tight"
            >
              {t("tasksTitle")}
            </h2>
            {tasks.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {tasks.map((step, index) => (
                  <li key={step.id}>
                    <Link
                      href={`/steps/${step.id}?trip=${active.id}`}
                      className={`tap-target flex items-center gap-3 rounded-[1.375rem] border border-border bg-surface-raised p-3 ${focusRing}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${taskTiles[index % taskTiles.length]}`}
                      >
                        <ChecklistIcon className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-bold break-words">
                          {locale === "en" ? step.title_en : step.title_id}
                        </span>
                        <span className="truncate text-xs text-muted">
                          {phaseLabel(step.phase_key)}
                        </span>
                      </span>
                      <ChevronRightIcon className="size-5 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{t("tasksDone")}</p>
            )}
          </section>

          <div className="flex flex-col gap-2 pt-1.5 md:items-start lg:col-span-2">
            {/* /cari doesn't exist yet: fe-069 turns this into
                <ButtonLink href="/cari"> and adds the Cari tab. */}
            <Button disabled aria-describedby="beranda-search-soon">
              {t("search")}
            </Button>
            <p id="beranda-search-soon" className="text-sm text-muted">
              {t("searchSoon")}
            </p>
          </div>
        </div>
      </main>
      <AppBottomNav activeHref="/dashboard" />
    </div>
  );
}
