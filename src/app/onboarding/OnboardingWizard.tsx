"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { RangeCalendar } from "@/components/ui/RangeCalendar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import {
  addDays,
  dateStepError,
  lastTravelDate,
  legsPayload,
  toUtcDate,
  tripLength,
  yearMonthOf,
  type DateStepError,
  type LegDates,
} from "@/lib/onboarding/dates";
import {
  isValidTravelerName,
  maxNameLength,
  maxNotesLength,
  maxTravelers,
  onboardingCities,
  passportStatuses,
  tripLegCities,
  type OnboardingCity,
  type PassportStatus,
  type TripLegCity,
} from "@/lib/onboarding/validate";
import { createAdditionalTrip } from "@/app/trips/new/actions";
import {
  createTripFromOnboarding,
  type OnboardingActionResult,
} from "./actions";

// `id` is the message key under Onboarding.steps.
const steps = ["city", "date", "passport", "travelers", "needs"] as const;
const lastStep = steps.length - 1;

type StepError = "city" | DateStepError | "passport" | "names" | "notes";

// Trip lengths offered as chips, from the design preview.
const durations = [9, 11, 14] as const;

const noLegs: Record<TripLegCity, LegDates> = {
  Makkah: { startDate: "", endDate: "" },
  Madinah: { startDate: "", endDate: "" },
};

type TravelerRow = {
  key: number;
  name: string;
  isMinor: boolean;
  hasDisability: boolean;
};

const newRow = (key: number): TravelerRow => ({
  key,
  name: "",
  isMinor: false,
  hasDisability: false,
});

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";
const fieldClassName = `tap-target w-full rounded-2xl border border-border bg-surface-raised px-4 text-base text-foreground ${focusRing}`;
const secondaryClassName = `tap-target inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface-raised px-6 font-semibold text-foreground disabled:opacity-60 ${focusRing}`;

// `onboarding` is a first-time user's first trip; `newTrip` (/trips/new) adds
// another one and leaves room for the BottomNav below `lg`.
export function OnboardingWizard({
  variant,
  today,
}: {
  variant: "onboarding" | "newTrip";
  // `YYYY-MM-DD` on the server clock, matching validation.
  today: string;
}) {
  const t = useTranslations("Onboarding");
  const tNewTrip = useTranslations("Dashboard.newTrip");
  const format = useFormatter();
  const isNewTrip = variant === "newTrip";
  const submitTrip = isNewTrip ? createAdditionalTrip : createTripFromOnboarding;

  const [step, setStep] = useState(0);
  const [city, setCity] = useState<OnboardingCity | "">("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [legs, setLegs] = useState(noLegs);
  const [passport, setPassport] = useState<PassportStatus | "">("");
  const [travelers, setTravelers] = useState<TravelerRow[]>([newRow(0)]);
  const [notes, setNotes] = useState("");
  const [showError, setShowError] = useState(false);
  const [submitError, setSubmitError] = useState<
    OnboardingActionResult["error"] | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const nextKey = useRef(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  // Move focus to the new step's heading, but not on first render.
  useEffect(() => {
    if (hasNavigated.current) headingRef.current?.focus();
  }, [step]);

  const anyDisability = travelers.some((row) => row.hasDisability);

  const firstMonth = yearMonthOf(today);
  const lastDate = lastTravelDate(firstMonth);
  const selectedLength =
    departureDate && returnDate ? tripLength(departureDate, returnDate) : null;
  const formatDate = (iso: string) =>
    format.dateTime(toUtcDate(iso), { dateStyle: "medium", timeZone: "UTC" });

  function stepError(): StepError | null {
    switch (steps[step]) {
      case "city":
        return city ? null : "city";
      case "date":
        return dateStepError(departureDate, returnDate, legs, firstMonth);
      case "passport":
        return passport ? null : "passport";
      case "travelers":
        return travelers.every((row) => isValidTravelerName(row.name))
          ? null
          : "names";
      case "needs":
        return notes.trim().length <= maxNotesLength ? null : "notes";
    }
  }

  const error = showError ? stepError() : null;

  // Clearing the notes whenever no disability is ticked keeps them hidden and empty.
  function updateTravelers(next: TravelerRow[]) {
    setTravelers(next);
    if (!next.some((row) => row.hasDisability)) setNotes("");
  }

  function updateRow(key: number, change: Partial<TravelerRow>) {
    updateTravelers(
      travelers.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );
  }

  function goTo(nextStep: number) {
    hasNavigated.current = true;
    setShowError(false);
    setSubmitError(null);
    setStep(nextStep);
  }

  function handleNext() {
    if (stepError()) {
      setShowError(true);
      return;
    }
    if (step < lastStep) {
      goTo(step + 1);
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      // Success redirects to the new trip; only failures return here.
      const result = await submitTrip({
        city,
        departureDate,
        returnDate,
        legs: legsPayload(legs),
        passport,
        travelers: travelers.map(({ name, isMinor, hasDisability }) => ({
          name,
          isMinor,
          hasDisability,
        })),
        disabilityNotes: anyDisability ? notes : null,
      });
      if (result) setSubmitError(result.error);
    });
  }

  const stepKey = steps[step];

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main
        className={`grid flex-1 content-start gap-6 pt-2 lg:grid-cols-2 lg:gap-16 lg:pt-8 lg:pb-16 ${
          isNewTrip ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : "pb-10"
        }`}
      >
        {/* Below lg the step's own title is the visual heading (preview
            screen 11): the page title is read by screen readers only and the
            intro moves below the form. */}
        <div className="contents lg:flex lg:flex-col lg:gap-3">
          <h1 className="sr-only lg:not-sr-only lg:text-5xl lg:leading-tight lg:font-bold lg:tracking-tight">
            {isNewTrip ? tNewTrip("title") : t("title")}
          </h1>
          <p className="order-last text-sm text-muted lg:order-none lg:text-xl">
            {isNewTrip ? tNewTrip("intro") : t("intro")}
          </p>
          <ol
            aria-label={t("stepsLabel")}
            className="mt-6 hidden flex-col gap-2 lg:flex"
          >
            {steps.map((id, index) => {
              const current = index === step;
              return (
                <li
                  key={id}
                  aria-current={current ? "step" : undefined}
                  className={`flex items-center gap-3 rounded-[1.375rem] border px-4 py-3 text-lg ${
                    current
                      ? "border-surface-line bg-surface font-semibold text-foreground"
                      : "border-transparent text-muted"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full text-base font-semibold ${
                      current
                        ? "bg-accent-soft text-accent"
                        : "border border-border"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {t(`steps.${id}.title`)}
                </li>
              );
            })}
          </ol>
        </div>

        <form
          noValidate
          className="flex flex-col gap-5 lg:rounded-[2rem] lg:border lg:border-surface-line lg:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            handleNext();
          }}
        >
          <div aria-hidden="true" className="flex gap-1.5">
            {steps.map((id, index) => (
              <span
                key={id}
                className={`h-1 flex-1 rounded-full ${
                  index <= step ? "bg-primary" : "bg-surface-line"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <p aria-live="polite" className="text-xs font-medium text-muted">
                {t("progress", { current: step + 1, total: steps.length })}
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mt-0.5 text-[1.875rem] leading-tight font-bold tracking-[-0.03em] break-words outline-none lg:text-[2.125rem]"
              >
                {t(`steps.${stepKey}.title`)}
              </h2>
              {/* The date step shows its hint below the calendar (preview screen 11). */}
              {stepKey !== "date" && (
                <p className="mt-1 text-muted">{t(`steps.${stepKey}.hint`)}</p>
              )}
            </div>

            {stepKey === "city" && (
              <SegmentedControl<OnboardingCity | "">
                label={t("steps.city.title")}
                options={onboardingCities.map((value) => ({
                  value,
                  label: value,
                }))}
                value={city}
                onChange={setCity}
              />
            )}

            {stepKey === "date" && (
              <div className="flex flex-col gap-4">
                <div
                  role="group"
                  aria-label={t("durationLabel")}
                  className="flex flex-wrap gap-2"
                >
                  {durations.map((days) => (
                    <Chip
                      key={days}
                      selected={selectedLength === days}
                      disabled={!departureDate}
                      className="disabled:opacity-50"
                      onClick={() =>
                        setReturnDate(addDays(departureDate, days - 1))
                      }
                    >
                      {t("durationChip", { days })}
                    </Chip>
                  ))}
                </div>
                <RangeCalendar
                  value={{
                    start: departureDate || null,
                    end: returnDate || null,
                  }}
                  min={today}
                  max={lastDate}
                  today={today}
                  onChange={({ start, end }) => {
                    setDepartureDate(start ?? "");
                    setReturnDate(end ?? "");
                  }}
                  label={t("calendarLabel")}
                  previousMonthLabel={t("previousMonth")}
                  nextMonthLabel={t("nextMonth")}
                />
                <p aria-live="polite" className="font-medium">
                  {!departureDate
                    ? t("pickDeparture")
                    : !returnDate
                      ? t("pickReturn")
                      : t("rangeSummary", {
                          start: formatDate(departureDate),
                          end: formatDate(returnDate),
                          days: tripLength(departureDate, returnDate),
                        })}
                </p>
                <p className="text-sm text-muted">{t("steps.date.hint")}</p>

                <div className="flex flex-col gap-4 border-t border-surface-line pt-4">
                  <div>
                    <h3 className="font-semibold">{t("legsTitle")}</h3>
                    <p className="text-sm text-muted">{t("legsHint")}</p>
                  </div>
                  {tripLegCities.map((legCity) => (
                    <fieldset key={legCity} className="flex flex-col gap-2">
                      <legend className="mb-2 font-semibold">{legCity}</legend>
                      <div className="grid grid-cols-2 gap-3">
                        {(["startDate", "endDate"] as const).map((field) => (
                          <div key={field} className="flex min-w-0 flex-col gap-1">
                            <label
                              htmlFor={`leg-${legCity}-${field}`}
                              className="text-sm font-medium"
                            >
                              {t(field === "startDate" ? "legStart" : "legEnd")}
                            </label>
                            <input
                              id={`leg-${legCity}-${field}`}
                              type="date"
                              min={departureDate || today}
                              max={returnDate || lastDate}
                              value={legs[legCity][field]}
                              aria-invalid={
                                error === "legs" || error === "legsMissing"
                              }
                              onChange={(event) =>
                                setLegs({
                                  ...legs,
                                  [legCity]: {
                                    ...legs[legCity],
                                    [field]: event.target.value,
                                  },
                                })
                              }
                              className={fieldClassName}
                            />
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>
            )}

            {stepKey === "passport" && (
              <SegmentedControl<PassportStatus | "">
                label={t("steps.passport.title")}
                options={passportStatuses.map((value) => ({
                  value,
                  label: t(`passport.${value}`),
                }))}
                value={passport}
                onChange={setPassport}
              />
            )}

            {stepKey === "travelers" && (
              <div className="flex flex-col gap-4">
                <ul className="flex flex-col gap-4">
                  {travelers.map((row, index) => (
                    <li key={row.key} className="flex items-end gap-3">
                      <div className="flex flex-1 flex-col gap-1">
                        <label
                          htmlFor={`traveler-${row.key}`}
                          className="font-medium"
                        >
                          {t("travelerLabel", { number: index + 1 })}
                        </label>
                        <input
                          id={`traveler-${row.key}`}
                          type="text"
                          autoComplete="off"
                          maxLength={maxNameLength}
                          value={row.name}
                          aria-invalid={
                            showError && !isValidTravelerName(row.name)
                          }
                          onChange={(event) =>
                            updateRow(row.key, { name: event.target.value })
                          }
                          className={fieldClassName}
                        />
                      </div>
                      {travelers.length > 1 && (
                        <IconButton
                          label={t("removeTraveler", { number: index + 1 })}
                          onClick={() =>
                            updateTravelers(
                              travelers.filter((other) => other.key !== row.key),
                            )
                          }
                        >
                          <CloseIcon className="size-5" />
                        </IconButton>
                      )}
                    </li>
                  ))}
                </ul>
                {travelers.length < maxTravelers ? (
                  <button
                    type="button"
                    className={`${secondaryClassName} self-start`}
                    onClick={() =>
                      updateTravelers([
                        ...travelers,
                        newRow(nextKey.current++),
                      ])
                    }
                  >
                    <PlusIcon className="size-5" />
                    {t("addTraveler")}
                  </button>
                ) : (
                  <p className="text-muted">
                    {t("travelerLimit", { max: maxTravelers })}
                  </p>
                )}
              </div>
            )}

            {stepKey === "needs" && (
              <div className="flex flex-col gap-5">
                <ul className="flex flex-col gap-4">
                  {travelers.map((row) => (
                    <li key={row.key}>
                      <fieldset>
                        <legend className="mb-2 font-semibold break-words">
                          {row.name.trim()}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          <Chip
                            selected={row.hasDisability}
                            onClick={() =>
                              updateRow(row.key, {
                                hasDisability: !row.hasDisability,
                              })
                            }
                          >
                            {t("hasDisability")}
                          </Chip>
                          <Chip
                            selected={row.isMinor}
                            onClick={() =>
                              updateRow(row.key, { isMinor: !row.isMinor })
                            }
                          >
                            {t("isMinor")}
                          </Chip>
                        </div>
                      </fieldset>
                    </li>
                  ))}
                </ul>
                {anyDisability && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="disability-notes" className="font-medium">
                      {t("notesLabel")}
                    </label>
                    <textarea
                      id="disability-notes"
                      rows={4}
                      maxLength={maxNotesLength}
                      value={notes}
                      aria-describedby="disability-notes-hint"
                      onChange={(event) => setNotes(event.target.value)}
                      className={`${fieldClassName} py-3`}
                    />
                    <p id="disability-notes-hint" className="text-muted">
                      {t("notesHint", { max: maxNotesLength })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="font-medium text-foreground">
                {t(`errors.${error}`)}
              </p>
            )}
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-[1.375rem] border border-surface-line bg-surface px-4 py-3 font-medium text-foreground"
            >
              {t(`errors.${submitError}`)}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center">
            {step > 0 && (
              <button
                type="button"
                className={secondaryClassName}
                disabled={isPending}
                onClick={() => goTo(step - 1)}
              >
                {t("back")}
              </button>
            )}
            <Button type="submit" disabled={isPending} className="md:ml-auto">
              {step < lastStep
                ? t("next")
                : isPending
                  ? t("submitting")
                  : t("submit")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
