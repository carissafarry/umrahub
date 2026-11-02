import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/trips/StatusBadge";
import { StatusCircle } from "@/components/trips/StatusCircle";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { parseMarkdown } from "@/lib/steps/markdown";
import type { StepComment } from "@/lib/steps/comments";
import type { DetailStep, Prerequisite } from "@/lib/steps/queries";
import type { CostText } from "@/lib/trips/checklist";
import type { ChecklistTrip } from "@/lib/trips/queries";
import { GuideMarkdown } from "./GuideMarkdown";
import { ReportOutdatedInfo } from "./ReportOutdatedInfo";
import { StepComments } from "./StepComments";

type StepDetailProps = {
  step: DetailStep;
  trip: ChecklistTrip | null;
  cost: CostText;
  prerequisites: Prerequisite[];
  comments: StepComment[];
};

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

// The /steps/[id] page body: back link, title and summary, cost card and
// prerequisite rows (sticky side column on desktop), the full guide with
// its "report outdated info" button, and the pilgrims' tips below it.
export async function StepDetail({
  step,
  trip,
  cost,
  prerequisites,
  comments,
}: StepDetailProps) {
  const locale = await getLocale();
  const t = await getTranslations("StepDetail");
  const tChecklist = await getTranslations("Checklist");
  const en = locale === "en";
  const title = en ? step.title_en : step.title_id;
  const summary = en ? step.summary_en : step.summary_id;
  const guide = parseMarkdown(
    (en ? step.detail_content_en : step.detail_content_id) ?? "",
  );
  const first = guide[0];
  const startsWithSection = first?.type === "heading" && first.level === 2;
  const tripQuery = trip ? `?trip=${trip.id}` : "";

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-col gap-6 pt-2 pb-10 lg:gap-8 lg:pt-8 lg:pb-16">
        <Link
          href={trip ? `/trips/${trip.id}` : "/onboarding"}
          className={`tap-target inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground ${focusRing}`}
        >
          <ArrowRightIcon className="size-4 rotate-180" />
          {t("backToChecklist")}
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10">
          <div className="flex flex-col gap-2 lg:col-start-1 lg:row-start-1">
            <h1 className="text-3xl leading-tight font-bold lg:text-4xl">
              {title}
            </h1>
            {summary && <p className="text-lg text-muted">{summary}</p>}
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Card as="section" className="flex flex-col gap-1 lg:p-7">
              <h2 className="text-sm font-medium text-muted">
                {tChecklist("costLabel")}
              </h2>
              <p>
                <span className="text-2xl font-bold tracking-tight">
                  {tChecklist(`cost.${cost.key}`, cost.values)}
                </span>
                {cost.key !== "none" && (
                  <span className="text-sm text-muted">
                    {" "}
                    {tChecklist("perPerson")}
                  </span>
                )}
              </p>
              {trip ? (
                <p className="text-sm text-muted">
                  {tChecklist("departureCity", { city: trip.departure_city })}
                </p>
              ) : (
                step.cost_varies_by_city && (
                  <p className="text-sm text-muted">{t("costVariesNote")}</p>
                )
              )}
              <p className="text-sm text-muted">{tChecklist("disclaimer")}</p>
            </Card>

            {prerequisites.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-bold tracking-tight">
                  {t("prerequisitesTitle")}
                </h2>
                <Card
                  as="ul"
                  className="flex flex-col divide-y divide-surface-line px-4 py-1"
                >
                  {prerequisites.map((prerequisite) => {
                    const prerequisiteTitle = en
                      ? prerequisite.title_en
                      : prerequisite.title_id;
                    return (
                      <li
                        key={prerequisite.id}
                        className="flex items-center gap-3 py-2"
                      >
                        {prerequisite.status && (
                          <StatusCircle status={prerequisite.status} />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col items-start">
                          <Link
                            href={`/steps/${prerequisite.id}${tripQuery}`}
                            className={`tap-target flex items-center rounded-xl text-sm font-bold break-words text-primary underline underline-offset-4 ${focusRing}`}
                          >
                            {prerequisiteTitle}
                          </Link>
                          {prerequisite.status && (
                            <StatusBadge
                              status={prerequisite.status}
                              label={tChecklist(
                                `status.${prerequisite.status}`,
                              )}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </Card>
              </section>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-2">
            <section aria-label={t("guideTitle")} className="flex flex-col gap-4">
              {!startsWithSection && (
                <h2 className="sr-only">{t("guideTitle")}</h2>
              )}
              {guide.length > 0 ? (
                <GuideMarkdown blocks={guide} />
              ) : (
                <p className="text-muted">{t("guideEmpty")}</p>
              )}
              <ReportOutdatedInfo stepId={step.id} />
            </section>

            <StepComments stepId={step.id} comments={comments} />
          </div>
        </div>
      </main>
    </div>
  );
}
