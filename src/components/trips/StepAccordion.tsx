"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  LockIcon,
} from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { updateStepStatus, updateStepTrackingMode } from "@/lib/trips/actions";
import {
  aggregateStatus,
  stepStatuses,
  trackingModes,
  type CostText,
  type StepStatus,
  type TrackingMode,
} from "@/lib/trips/checklist";
import { StatusBadge } from "./StatusBadge";
import { StatusCircle } from "./StatusCircle";

const warningBoxClassName =
  "rounded-2xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning";

export type TravelerStepStatus = {
  id: string;
  name: string;
  status: StepStatus;
};

type StepAccordionProps = {
  tripId: string;
  stepId: string;
  title: string;
  summary: string | null;
  cost: CostText;
  trackingMode: TrackingMode;
  // Trip-level status, shown in shared mode.
  status: StepStatus;
  // Each traveler's own status in loader order, shown in individual mode.
  travelers: TravelerStepStatus[];
  // Localized titles of prerequisites that are not completed yet.
  prerequisites: string[];
};

// One checklist step: a list row with its status circle, cost and status pill,
// expanding to the summary, per-person cost, one status control (shared) or
// one per traveler (individual) and the tracking-mode switch. An individual
// step on a trip without travelers keeps the single control. Prerequisites are
// advisory: a blocked step is marked and warned about, never locked.
export function StepAccordion({
  tripId,
  stepId,
  title,
  summary,
  cost,
  trackingMode,
  status,
  travelers,
  prerequisites,
}: StepAccordionProps) {
  const t = useTranslations("Checklist");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [warnPrerequisites, setWarnPrerequisites] = useState(false);
  // Each falls back to the server's value when its transition ends: the new
  // value after revalidation, or the previous one if saving failed.
  const [shownMode, setShownMode] = useOptimistic(trackingMode);
  const [shownStatus, setShownStatus] = useOptimistic(status);
  const [shownTravelers, setTravelerStatus] = useOptimistic(
    travelers,
    (current, next: { id: string; status: StepStatus }) =>
      current.map((traveler) =>
        traveler.id === next.id
          ? { ...traveler, status: next.status }
          : traveler,
      ),
  );
  const [, startTransition] = useTransition();
  const panelId = `step-panel-${stepId}`;
  const perTraveler = shownMode === "individual" && shownTravelers.length > 0;
  const headerStatus = perTraveler
    ? aggregateStatus(shownTravelers.map((traveler) => traveler.status))
    : shownStatus;
  const blocked = headerStatus !== "completed" && prerequisites.length > 0;
  const prerequisiteList = new Intl.ListFormat(locale, {
    type: "conjunction",
  }).format(prerequisites);

  function save(
    showOptimistic: () => void,
    action: () => Promise<{ ok: boolean }>,
  ) {
    setSaveFailed(false);
    startTransition(async () => {
      showOptimistic();
      try {
        const result = await action();
        if (!result.ok) setSaveFailed(true);
      } catch {
        setSaveFailed(true);
      }
    });
  }

  function changeStatus(
    current: StepStatus,
    next: StepStatus,
    travelerId: string | null,
  ) {
    if (next === current) return;
    setWarnPrerequisites(next === "completed" && prerequisites.length > 0);
    save(
      () =>
        travelerId === null
          ? setShownStatus(next)
          : setTravelerStatus({ id: travelerId, status: next }),
      () => updateStepStatus(tripId, stepId, next, travelerId),
    );
  }

  function changeMode(next: TrackingMode) {
    if (next === shownMode) return;
    setWarnPrerequisites(false);
    save(
      () => setShownMode(next),
      () => updateStepTrackingMode(tripId, stepId, next),
    );
  }

  const statusOptions = stepStatuses.map((value) => ({
    value,
    label: t(`status.${value}`),
  }));

  return (
    <li>
      <h4>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="tap-target flex w-full items-center gap-3 rounded-2xl py-3 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <StatusCircle status={headerStatus} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-bold break-words">{title}</span>
            <span className="text-xs text-muted">
              {t(`cost.${cost.key}`, cost.values)}
              {cost.key !== "none" && ` ${t("perPerson")}`}
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <StatusBadge
                status={headerStatus}
                label={t(`status.${headerStatus}`)}
              />
              {blocked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-dusk-tile px-2.5 py-0.5 text-xs font-bold text-dusk-ink">
                  <LockIcon className="size-3 shrink-0" />
                  {t("blocked")}
                </span>
              )}
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
        className="flex flex-col gap-4 border-t border-surface-line py-4"
      >
        {summary && <p className="text-sm text-muted">{summary}</p>}
        <p className="text-sm">
          <span className="block text-muted">{t("costLabel")}</span>
          <span className="font-semibold">
            {t(`cost.${cost.key}`, cost.values)}
          </span>
          {cost.key !== "none" && (
            <span className="text-muted"> {t("perPerson")}</span>
          )}
        </p>
        {perTraveler ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {shownTravelers.map((traveler) => (
              <li key={traveler.id} className="flex min-w-0 flex-col gap-2">
                <p className="font-semibold break-words">{traveler.name}</p>
                <SegmentedControl
                  label={t("travelerStatusLabel", {
                    name: traveler.name,
                    title,
                  })}
                  options={statusOptions}
                  value={traveler.status}
                  onChange={(next) =>
                    changeStatus(traveler.status, next, traveler.id)
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <SegmentedControl
            label={t("statusControlLabel", { title })}
            options={statusOptions}
            value={shownStatus}
            onChange={(next) => changeStatus(shownStatus, next, null)}
          />
        )}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t("trackingModeHeading")}</p>
          <SegmentedControl
            label={t("trackingModeLabel", { title })}
            options={trackingModes.map((value) => ({
              value,
              label: t(`trackingMode.${value}`),
            }))}
            value={shownMode}
            onChange={changeMode}
          />
        </div>
        {blocked && (
          <p className={warningBoxClassName}>
            {t("blockedBy", { steps: prerequisiteList })}
          </p>
        )}
        {warnPrerequisites && (
          <p role="status" className={warningBoxClassName}>
            {t("prerequisiteWarning", { steps: prerequisiteList })}
          </p>
        )}
        {saveFailed && (
          <p
            role="alert"
            className="rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground"
          >
            {t("saveFailed")}
          </p>
        )}
        <Link
          href={`/steps/${stepId}?trip=${tripId}`}
          aria-label={t("learnMoreLabel", { title })}
          className="tap-target inline-flex items-center gap-2 self-start rounded-full text-sm font-bold text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("learnMore")}
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </li>
  );
}
