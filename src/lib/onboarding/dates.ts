// `YYYY-MM-DD` date helpers for the onboarding date step. Dates stay strings
// and all arithmetic is in UTC, so no timezone can shift a day.
import {
  isWithinTravelRange,
  monthsAhead,
  tripLegCities,
  type TripLeg,
  type YearMonth,
} from "./validate";

const pad = (value: number) => String(value).padStart(2, "0");

const fromUtc = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export function toUtcDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Today on the given clock's local calendar, like `currentYearMonth`.
export function localIsoDate(now: Date) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, days: number) {
  const date = toUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

// Number of days from start to end, both included (12–22 Jan is 11 days).
export function tripLength(start: string, end: string) {
  return (toUtcDate(end).getTime() - toUtcDate(start).getTime()) / 86_400_000 + 1;
}

export function yearMonthOf(iso: string): YearMonth {
  const [year, month] = iso.split("-").map(Number);
  return { year, month };
}

// The last day of the last month `isWithinTravelRange` accepts.
export function lastTravelDate(first: YearMonth) {
  return fromUtc(new Date(Date.UTC(first.year, first.month + monthsAhead, 0)));
}

export type LegDates = { startDate: string; endDate: string };

export type DateStepError = "date" | "returnDate" | "legsMissing" | "legs";

// The client copy of the server's dated-input rules (`parseOnboardingInput`):
// one leg per filled city row, in Makkah then Madinah order.
export function dateStepError(
  departureDate: string,
  returnDate: string,
  legs: Record<(typeof tripLegCities)[number], LegDates>,
  first: YearMonth,
): DateStepError | null {
  if (!departureDate || !isWithinTravelRange(yearMonthOf(departureDate), first)) {
    return "date";
  }
  if (!returnDate || returnDate < departureDate) return "returnDate";

  let earliestStart = departureDate;
  let filled = 0;
  for (const city of tripLegCities) {
    const { startDate, endDate } = legs[city];
    if (!startDate && !endDate) continue;
    if (
      !startDate ||
      !endDate ||
      startDate < earliestStart ||
      startDate > endDate ||
      endDate > returnDate
    ) {
      return "legs";
    }
    earliestStart = endDate;
    filled += 1;
  }
  return filled > 0 ? null : "legsMissing";
}

export function legsPayload(
  legs: Record<(typeof tripLegCities)[number], LegDates>,
): TripLeg[] {
  return tripLegCities
    .filter((city) => legs[city].startDate || legs[city].endDate)
    .map((city) => ({ city, ...legs[city] }));
}
