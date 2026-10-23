import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { computeBudget, type BudgetStep } from "@/lib/trips/budget";
import {
  costText,
  type CityCostOverride,
  type CostRange,
  type StepConfig,
} from "@/lib/trips/checklist";
import type { ChecklistTrip } from "@/lib/trips/queries";

type TripBudgetProps = {
  trip: ChecklistTrip;
  steps: BudgetStep[];
  overrides: CityCostOverride[];
  configs: StepConfig[];
  travelers: { id: string }[];
};

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

// The /trips/[id]/budget page body: back link, heading, the total with a
// per-phase bar chart (on top on phones, sticky side column on desktop) and
// the step totals grouped by phase.
export async function TripBudget({
  trip,
  steps,
  overrides,
  configs,
  travelers,
}: TripBudgetProps) {
  const locale = await getLocale();
  const t = await getTranslations("Budget");
  const tChecklist = await getTranslations("Checklist");
  // Content added later in Studio may use keys without a message yet.
  const phaseLabel = (key: string) =>
    tChecklist.has(`phases.${key}`) ? tChecklist(`phases.${key}`) : key;
  const range = (cost: CostRange) => {
    const text = costText(cost);
    return tChecklist(`cost.${text.key}`, text.values);
  };
  const budget = computeBudget({
    steps,
    overrides,
    departureCity: trip.departure_city,
    configs,
    travelerCount: travelers.length,
  });
  const largest = Math.max(0, ...budget.phases.map((phase) => phase.total.max));
  const percent = (amount: number) =>
    largest === 0 ? 0 : (amount / largest) * 100;

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-col gap-6 pt-2 pb-10 lg:gap-8 lg:pt-8 lg:pb-16">
        <Link
          href={`/trips/${trip.id}`}
          className={`tap-target inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface px-4 font-medium text-foreground shadow-card ${focusRing}`}
        >
          <ArrowRightIcon className="size-4 rotate-180" />
          {t("backToChecklist")}
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="text-3xl leading-tight font-bold lg:text-4xl">
            {t("title", { name: trip.name })}
          </h1>
          <p className="text-muted">
            {t("travelers", { count: budget.travelers })} ·{" "}
            {tChecklist("departureCity", { city: trip.departure_city })}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <Card
            as="section"
            className="flex flex-col gap-5 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:p-7"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">{t("totalTitle")}</h2>
              <p className="text-2xl font-bold">{range(budget.total)}</p>
              <p className="text-sm text-muted">{t("totalNote")}</p>
            </div>
            {budget.phases.length > 0 && (
              <ul aria-label={t("chartLabel")} className="flex flex-col gap-4">
                {budget.phases.map((phase) => (
                  <li key={phase.key} className="flex flex-col gap-1.5">
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{phaseLabel(phase.key)}</span>
                      <span className="text-muted">{range(phase.total)}</span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="flex h-3 overflow-hidden rounded-full bg-tile-violet"
                    >
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${percent(phase.total.min)}%` }}
                      />
                      <div
                        className="h-full bg-primary/40"
                        style={{
                          width: `${percent(phase.total.max - phase.total.min)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted">{tChecklist("disclaimer")}</p>
          </Card>

          <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
            {budget.phases.length === 0 && (
              <p className="text-lg text-muted">{tChecklist("empty")}</p>
            )}
            {budget.phases.map((phase) => (
              <section
                key={phase.key}
                aria-labelledby={`budget-phase-${phase.key}`}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-4">
                  <h2
                    id={`budget-phase-${phase.key}`}
                    className="text-xl font-semibold lg:text-2xl"
                  >
                    {phaseLabel(phase.key)}
                  </h2>
                  <p className="md:shrink-0">
                    <span className="text-muted">{t("phaseTotal")}: </span>
                    <span className="font-semibold">{range(phase.total)}</span>
                  </p>
                </div>
                <Card className="lg:p-7">
                  <ul className="flex flex-col divide-y divide-border">
                    {phase.steps.map(({ step, perPerson, individual, multiplier, total }) => {
                      const hasCost = costText(total).key !== "none";
                      return (
                        <li
                          key={step.id}
                          className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between md:gap-6"
                        >
                          <p className="font-medium">
                            {locale === "en" ? step.title_en : step.title_id}
                          </p>
                          <div className="flex flex-col md:items-end md:text-right">
                            <p className={hasCost ? "font-semibold" : "text-muted"}>
                              {range(total)}
                            </p>
                            {hasCost && (
                              <p className="text-sm text-muted">
                                {individual
                                  ? t("perPersonTimes", {
                                      amount: range(perPerson),
                                      count: multiplier,
                                    })
                                  : t("shared")}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
