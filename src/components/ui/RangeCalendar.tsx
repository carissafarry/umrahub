"use client";

import { useState } from "react";
import { useFormatter } from "next-intl";
import { IconButton } from "./IconButton";
import { ChevronRightIcon } from "./icons";

export type DateRange = { start: string | null; end: string | null };

type RangeCalendarProps = {
  // `YYYY-MM-DD` strings; `min`/`max` bound the selectable days.
  value: DateRange;
  min: string;
  max: string;
  today: string;
  onChange: (range: DateRange) => void;
  label: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
};

const pad = (value: number) => String(value).padStart(2, "0");
const isoOf = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(day)}`;
// Months as one running number, so prev/next and bounds are simple sums.
const monthNumber = (iso: string) => {
  const [year, month] = iso.split("-").map(Number);
  return year * 12 + month - 1;
};

// First tap sets the start; the next tap on or after it sets the end. A tap
// before the start, or on a finished range, starts a new range.
export function nextRange({ start, end }: DateRange, day: string): DateRange {
  if (!start || end || day < start) return { start: day, end: null };
  return { start, end: day };
}

// One month at a time, weeks starting on Sunday as in the design preview.
export function RangeCalendar({
  value,
  min,
  max,
  today,
  onChange,
  label,
  previousMonthLabel,
  nextMonthLabel,
}: RangeCalendarProps) {
  const format = useFormatter();
  const [shown, setShown] = useState(() =>
    Math.min(
      Math.max(monthNumber(value.start ?? today), monthNumber(min)),
      monthNumber(max),
    ),
  );
  const year = Math.floor(shown / 12);
  const month = (shown % 12) + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  // 2023-01-01 was a Sunday.
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    format.dateTime(new Date(Date.UTC(2023, 0, 1 + index)), {
      weekday: "short",
      timeZone: "UTC",
    }),
  );

  const { start, end } = value;

  return (
    <div
      role="group"
      aria-label={label}
      className="rounded-[1.75rem] border border-surface-line bg-surface-raised p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p aria-live="polite" className="pl-1 text-base font-bold">
          {format.dateTime(new Date(Date.UTC(year, month - 1, 1)), {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </p>
        <div className="flex gap-2">
          <IconButton
            label={previousMonthLabel}
            disabled={shown <= monthNumber(min)}
            onClick={() => setShown(shown - 1)}
            className="disabled:opacity-40"
          >
            <ChevronRightIcon className="size-5 rotate-180" />
          </IconButton>
          <IconButton
            label={nextMonthLabel}
            disabled={shown >= monthNumber(max)}
            onClick={() => setShown(shown + 1)}
            className="disabled:opacity-40"
          >
            <ChevronRightIcon className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {weekdays.map((weekday) => (
          <span
            key={weekday}
            aria-hidden="true"
            className="pb-1 text-xs font-semibold text-muted"
          >
            {weekday}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const iso = isoOf(year, month, day);
          const isEdge = iso === start || iso === end;
          const inRange =
            start !== null && end !== null && iso >= start && iso <= end;
          // The band runs from the start circle's centre to the end circle's.
          const band = !inRange || start === end
            ? null
            : iso === start
              ? "left-1/2 right-0"
              : iso === end
                ? "left-0 right-1/2"
                : "inset-x-0";
          return (
            <div key={iso} className="relative flex justify-center">
              {band && (
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 bg-surface ${band}`}
                />
              )}
              <button
                type="button"
                disabled={iso < min || iso > max}
                aria-label={format.dateTime(new Date(Date.UTC(year, month - 1, day)), {
                  dateStyle: "full",
                  timeZone: "UTC",
                })}
                aria-pressed={isEdge || inRange}
                aria-current={iso === today ? "date" : undefined}
                onClick={() => onChange(nextRange(value, iso))}
                className={`tap-target relative flex size-11 items-center justify-center rounded-full text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:font-normal disabled:text-muted disabled:opacity-50 ${
                  isEdge
                    ? "bg-primary text-primary-foreground"
                    : iso === today
                      ? "text-foreground underline underline-offset-4"
                      : "text-foreground"
                }`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
