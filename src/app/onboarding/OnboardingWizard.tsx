"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import {
  isValidTravelerName,
  isWithinTravelRange,
  maxNameLength,
  maxNotesLength,
  maxTravelers,
  onboardingCities,
  passportStatuses,
  type OnboardingCity,
  type PassportStatus,
  type YearMonth,
} from "@/lib/onboarding/validate";
import { createAdditionalTrip } from "@/app/trips/new/actions";
import {
  createTripFromOnboarding,
  type OnboardingActionResult,
} from "./actions";

// `id` is the message key under Onboarding.steps.
const steps = ["city", "date", "passport", "travelers", "needs"] as const;
const lastStep = steps.length - 1;

type StepError = "city" | "date" | "passport" | "names" | "notes";

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
const fieldClassName = `tap-target w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground ${focusRing}`;
const secondaryClassName = `tap-target inline-flex items-center justify-center gap-2 rounded-full bg-surface px-6 font-semibold text-foreground shadow-card disabled:opacity-60 ${focusRing}`;

// `onboarding` is a first-time user's first trip; `newTrip` (/trips/new) adds
// another one and leaves room for the BottomNav below `lg`.
export function OnboardingWizard({
  variant,
  firstMonth,
}: {
  variant: "onboarding" | "newTrip";
  firstMonth: YearMonth;
}) {
  const t = useTranslations("Onboarding");
  const tNewTrip = useTranslations("Dashboard.newTrip");
  const format = useFormatter();
  const isNewTrip = variant === "newTrip";
  const submitTrip = isNewTrip ? createAdditionalTrip : createTripFromOnboarding;

  const [step, setStep] = useState(0);
  const [city, setCity] = useState<OnboardingCity | "">("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
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

  const yearOptions = [0, 1, 2].map((offset) => firstMonth.year + offset);
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: format.dateTime(new Date(Date.UTC(2000, index, 1)), {
      month: "long",
      timeZone: "UTC",
    }),
  }));

  function stepError(): StepError | null {
    switch (steps[step]) {
      case "city":
        return city ? null : "city";
      case "date":
        return month &&
          year &&
          isWithinTravelRange(
            { year: Number(year), month: Number(month) },
            firstMonth,
          )
          ? null
          : "date";
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
        year: Number(year),
        month: Number(month),
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main
        className={`grid flex-1 content-start gap-6 pt-2 lg:grid-cols-2 lg:gap-16 lg:pt-8 lg:pb-16 ${
          isNewTrip ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : "pb-10"
        }`}
      >
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
            {isNewTrip ? tNewTrip("title") : t("title")}
          </h1>
          <p className="text-lg text-muted lg:text-xl">
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
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-lg ${
                    current
                      ? "bg-surface font-semibold text-foreground shadow-card"
                      : "text-muted"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full text-base font-semibold ${
                      current
                        ? "bg-tile-violet text-tile-violet-foreground"
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
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleNext();
          }}
        >
          <p aria-live="polite" className="font-semibold text-muted">
            {t("progress", { current: step + 1, total: steps.length })}
          </p>

          <Card className="flex flex-col gap-5 lg:p-8">
            <div>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-semibold outline-none lg:text-2xl"
              >
                {t(`steps.${stepKey}.title`)}
              </h2>
              <p className="mt-1 text-muted">{t(`steps.${stepKey}.hint`)}</p>
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="travel-month" className="font-medium">
                    {t("monthLabel")}
                  </label>
                  <select
                    id="travel-month"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    className={fieldClassName}
                  >
                    <option value="" disabled>
                      {t("choose")}
                    </option>
                    {monthOptions.map(({ value, label }) => (
                      <option
                        key={value}
                        value={value}
                        disabled={
                          year !== "" &&
                          !isWithinTravelRange(
                            { year: Number(year), month: value },
                            firstMonth,
                          )
                        }
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="travel-year" className="font-medium">
                    {t("yearLabel")}
                  </label>
                  <select
                    id="travel-year"
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    className={fieldClassName}
                  >
                    <option value="" disabled>
                      {t("choose")}
                    </option>
                    {yearOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
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
          </Card>

          {submitError && (
            <p
              role="alert"
              className="rounded-2xl border border-border bg-surface px-4 py-3 font-medium text-foreground shadow-card"
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
