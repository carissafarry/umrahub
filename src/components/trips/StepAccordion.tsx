"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
} from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { updateStepStatus } from "@/lib/trips/actions";
import {
  stepStatuses,
  type CostText,
  type StepStatus,
} from "@/lib/trips/checklist";
import { StatusBadge } from "./StatusBadge";

type StepAccordionProps = {
  tripId: string;
  stepId: string;
  title: string;
  summary: string | null;
  cost: CostText;
  status: StepStatus;
  // Localized titles of prerequisites that are not completed yet.
  prerequisites: string[];
};

// One checklist step: a collapsed header with its status badge, expanding to
// the summary, per-person cost and the status control. Prerequisites are
// advisory: a blocked step is marked and warned about, never locked.
export function StepAccordion({
  tripId,
  stepId,
  title,
  summary,
  cost,
  status,
  prerequisites,
}: StepAccordionProps) {
  const t = useTranslations("Checklist");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [warnPrerequisites, setWarnPrerequisites] = useState(false);
  // Falls back to the server's `status` when the transition ends: the new
  // value after revalidation, or the previous one if saving failed.
  const [shownStatus, setShownStatus] = useOptimistic(status);
  const [, startTransition] = useTransition();
  const panelId = `step-panel-${stepId}`;
  const blocked = shownStatus !== "completed" && prerequisites.length > 0;
  const prerequisiteList = new Intl.ListFormat(locale, {
    type: "conjunction",
  }).format(prerequisites);

  function changeStatus(next: StepStatus) {
    if (next === shownStatus) return;
    setSaveFailed(false);
    setWarnPrerequisites(next === "completed" && prerequisites.length > 0);
    startTransition(async () => {
      setShownStatus(next);
      try {
        const result = await updateStepStatus(tripId, stepId, next);
        if (!result.ok) setSaveFailed(true);
      } catch {
        setSaveFailed(true);
      }
    });
  }

  return (
    <Card as="li">
      <h4>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="tap-target flex w-full items-center gap-3 rounded-2xl text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span className="font-semibold">{title}</span>
            <span className="flex flex-wrap items-center gap-2 md:justify-end">
              {blocked && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-blue px-3 py-1 text-sm font-medium text-tile-blue-foreground">
                  <ClockIcon className="size-4 shrink-0" />
                  {t("blocked")}
                </span>
              )}
              <StatusBadge
                status={shownStatus}
                label={t(`status.${shownStatus}`)}
              />
            </span>
          </span>
          <ChevronDownIcon
            className={`size-5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h4>
      <div
        id={panelId}
        hidden={!open}
        className="mt-4 flex flex-col gap-4 border-t border-border pt-4"
      >
        {blocked && (
          <p className="font-medium text-foreground">
            {t("blockedBy", { steps: prerequisiteList })}
          </p>
        )}
        {summary && <p className="text-muted">{summary}</p>}
        <p>
          <span className="block text-sm text-muted">{t("costLabel")}</span>
          <span className="font-semibold">
            {t(`cost.${cost.key}`, cost.values)}
          </span>
          {cost.key !== "none" && (
            <span className="text-muted"> {t("perPerson")}</span>
          )}
        </p>
        <Link
          href={`/steps/${stepId}?trip=${tripId}`}
          aria-label={t("learnMoreLabel", { title })}
          className="tap-target inline-flex items-center gap-2 self-start rounded-full font-medium text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("learnMore")}
          <ArrowRightIcon className="size-4" />
        </Link>
        <SegmentedControl
          label={t("statusControlLabel", { title })}
          options={stepStatuses.map((value) => ({
            value,
            label: t(`status.${value}`),
          }))}
          value={shownStatus}
          onChange={changeStatus}
        />
        {warnPrerequisites && (
          <p
            role="status"
            className="rounded-2xl bg-tile-blue px-4 py-3 font-medium text-foreground"
          >
            {t("prerequisiteWarning", { steps: prerequisiteList })}
          </p>
        )}
        {saveFailed && (
          <p
            role="alert"
            className="rounded-2xl border border-border px-4 py-3 font-medium text-foreground"
          >
            {t("saveFailed")}
          </p>
        )}
      </div>
    </Card>
  );
}
