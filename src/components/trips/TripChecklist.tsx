import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRightIcon } from "@/components/ui/icons";
import {
  computeProgress,
  costText,
  groupSteps,
  resolveCost,
  stepStatus,
  type ChecklistStep,
  type CityCostOverride,
  type StepProgress,
} from "@/lib/trips/checklist";
import type { ChecklistTrip } from "@/lib/trips/queries";
import { ProgressCard } from "./ProgressCard";
import { StepAccordion } from "./StepAccordion";

type TripChecklistProps = {
  trip: ChecklistTrip;
  steps: ChecklistStep[];
  overrides: CityCostOverride[];
  progress: StepProgress[];
};

// The /trips/[id] page body: trip heading, progress card (sticky side panel
// on desktop) and the steps grouped by phase then category.
export async function TripChecklist({
  trip,
  steps,
  overrides,
  progress,
}: TripChecklistProps) {
  const locale = await getLocale();
  const t = await getTranslations("Checklist");
  // Content added later in Studio may use keys without a message yet.
  const label = (group: "phases" | "categories", key: string) =>
    t.has(`${group}.${key}`) ? t(`${group}.${key}`) : key;
  const phases = groupSteps(steps);

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-col gap-6 pt-2 pb-10 lg:gap-8 lg:pt-8 lg:pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl leading-tight font-bold lg:text-4xl">
            {trip.name}
          </h1>
          <p className="text-muted">
            {t("departureCity", { city: trip.departure_city })}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
            <ProgressCard {...computeProgress(steps, progress)} />
            <Link
              href={`/trips/${trip.id}/budget`}
              className="tap-target inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface px-4 font-medium text-foreground shadow-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("budgetLink")}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <div className="flex flex-col gap-10 lg:col-start-1 lg:row-start-1">
            {phases.length === 0 && (
              <p className="text-lg text-muted">{t("empty")}</p>
            )}
            {phases.map((phase) => (
              <section
                key={phase.key}
                aria-labelledby={`phase-${phase.key}`}
                className="flex flex-col gap-6"
              >
                <h2
                  id={`phase-${phase.key}`}
                  className="text-xl font-semibold lg:text-2xl"
                >
                  {label("phases", phase.key)}
                </h2>
                {phase.categories.map((category) => (
                  <div key={category.key} className="flex flex-col gap-3">
                    <h3 className="font-semibold text-muted">
                      {label("categories", category.key)}
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {category.steps.map((step) => (
                        <StepAccordion
                          key={step.id}
                          tripId={trip.id}
                          stepId={step.id}
                          title={locale === "en" ? step.title_en : step.title_id}
                          summary={
                            locale === "en" ? step.summary_en : step.summary_id
                          }
                          cost={costText(
                            resolveCost(step, overrides, trip.departure_city),
                          )}
                          status={stepStatus(step.id, progress)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
