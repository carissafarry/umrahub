import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import {
  computeProgress,
  costText,
  groupSteps,
  incompletePrerequisites,
  isIndividual,
  resolveCost,
  travelerStatus,
  type CityCostOverride,
  type DependentStep,
  type StepConfig,
  type StepProgress,
} from "@/lib/trips/checklist";
import type { ChecklistTraveler, ChecklistTrip } from "@/lib/trips/queries";
import { ProgressCard } from "./ProgressCard";
import { StepAccordion } from "./StepAccordion";

type TripChecklistProps = {
  trip: ChecklistTrip;
  steps: DependentStep[];
  overrides: CityCostOverride[];
  configs: StepConfig[];
  travelers: ChecklistTraveler[];
  progress: StepProgress[];
};

// The /trips/[id] page body: trip heading, progress card (sticky side panel
// on desktop) and the steps grouped by phase, with one card of rows per
// category.
export async function TripChecklist({
  trip,
  steps,
  overrides,
  configs,
  travelers,
  progress,
}: TripChecklistProps) {
  const locale = await getLocale();
  const t = await getTranslations("Checklist");
  // Content added later in Studio may use keys without a message yet.
  const label = (group: "phases" | "categories", key: string) =>
    t.has(`${group}.${key}`) ? t(`${group}.${key}`) : key;
  const title = (step: DependentStep) =>
    locale === "en" ? step.title_en : step.title_id;
  const phases = groupSteps(steps);
  const tracking = {
    configs,
    travelerIds: travelers.map((traveler) => traveler.id),
    progress,
  };

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
          <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
            <ProgressCard
              {...computeProgress(steps, tracking)}
              budgetHref={`/trips/${trip.id}/budget`}
            />
          </div>

          <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
            {phases.length === 0 && (
              <p className="text-lg text-muted">{t("empty")}</p>
            )}
            {phases.map((phase) => (
              <section
                key={phase.key}
                aria-labelledby={`phase-${phase.key}`}
                className="flex flex-col gap-4"
              >
                <h2
                  id={`phase-${phase.key}`}
                  className="text-lg font-bold tracking-tight lg:text-2xl"
                >
                  {label("phases", phase.key)}
                </h2>
                {phase.categories.map((category) => (
                  <div key={category.key} className="flex flex-col gap-2">
                    <h3 className="self-start rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
                      {label("categories", category.key)}
                    </h3>
                    <Card
                      as="ul"
                      className="flex flex-col divide-y divide-surface-line px-4 py-1"
                    >
                      {category.steps.map((step) => (
                        <StepAccordion
                          key={step.id}
                          tripId={trip.id}
                          stepId={step.id}
                          title={title(step)}
                          summary={
                            locale === "en" ? step.summary_en : step.summary_id
                          }
                          cost={costText(
                            resolveCost(step, overrides, trip.departure_city),
                          )}
                          trackingMode={
                            isIndividual(step, configs)
                              ? "individual"
                              : "shared"
                          }
                          status={travelerStatus(step.id, null, progress)}
                          travelers={travelers.map((traveler) => ({
                            ...traveler,
                            status: travelerStatus(
                              step.id,
                              traveler.id,
                              progress,
                            ),
                          }))}
                          prerequisites={incompletePrerequisites(
                            step,
                            steps,
                            tracking,
                          ).map(title)}
                        />
                      ))}
                    </Card>
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
