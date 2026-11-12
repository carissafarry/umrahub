// Onboarding wizard input rules, shared by the client wizard and the Server Action.

// Must match `city_cost_overrides.city` exactly.
export const onboardingCities = [
  "Jakarta",
  "Surabaya",
  "Medan",
  "Makassar",
  "Yogyakarta",
] as const;
export type OnboardingCity = (typeof onboardingCities)[number];

export const passportStatuses = ["valid", "expired", "none"] as const;
export type PassportStatus = (typeof passportStatuses)[number];

export const maxTravelers = 10;
export const maxNameLength = 80;
export const maxNotesLength = 500;
export const monthsAhead = 24;

// Cities a trip can be split into, in the order the design lists them.
export const tripLegCities = ["Makkah", "Madinah"] as const;
export type TripLegCity = (typeof tripLegCities)[number];
export const maxTripLegs = 2;

export type YearMonth = { year: number; month: number };

export type OnboardingTraveler = {
  name: string;
  isMinor: boolean;
  hasDisability: boolean;
};

// A stay in one city; dates are `YYYY-MM-DD`, the order is the array order.
export type TripLeg = {
  city: TripLegCity;
  startDate: string;
  endDate: string;
};

// Undated input (month only) has `departureDate: null`, `returnDate: null`
// and no legs; dated input derives `year`/`month` from `departureDate`.
export type OnboardingInput = {
  city: OnboardingCity;
  year: number;
  month: number;
  departureDate: string | null;
  returnDate: string | null;
  legs: TripLeg[];
  passport: PassportStatus;
  travelers: OnboardingTraveler[];
  disabilityNotes: string | null;
};

// Fixed codes only: errors never carry the submitted values.
export type OnboardingErrorCode =
  | "invalid_input"
  | "invalid_city"
  | "invalid_date"
  | "invalid_return_date"
  | "invalid_legs"
  | "invalid_passport"
  | "invalid_travelers"
  | "invalid_name"
  | "invalid_flags"
  | "invalid_notes";

export type ParseResult =
  | { ok: true; value: OnboardingInput }
  | { ok: false; error: OnboardingErrorCode };

const monthIndex = ({ year, month }: YearMonth) => year * 12 + month - 1;

// The first selectable travel month: the current month on the given clock.
export function currentYearMonth(now: Date): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function isWithinTravelRange(value: YearMonth, start: YearMonth) {
  const offset = monthIndex(value) - monthIndex(start);
  return offset >= 0 && offset <= monthsAhead;
}

export function isValidTravelerName(name: string) {
  const length = name.trim().length;
  return length >= 1 && length <= maxNameLength;
}

// A real calendar date written as `YYYY-MM-DD`. Such strings sort like dates.
function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(
  options: readonly T[],
  value: unknown,
): value is T => options.includes(value as T);

const isAbsent = (value: unknown) =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0);

// Legs must lie within the trip, in order, one per city; touching days are
// allowed (the Makkah to Madinah transfer happens within one day).
function parseLegs(
  legs: unknown,
  departureDate: string,
  returnDate: string,
): TripLeg[] | null {
  if (!Array.isArray(legs) || legs.length < 1 || legs.length > maxTripLegs) {
    return null;
  }
  const parsed: TripLeg[] = [];
  let earliestStart = departureDate;
  for (const leg of legs) {
    if (!isRecord(leg)) return null;
    const { city, startDate, endDate } = leg;
    if (
      !isOneOf(tripLegCities, city) ||
      parsed.some((p) => p.city === city) ||
      !isIsoDate(startDate) ||
      !isIsoDate(endDate) ||
      startDate < earliestStart ||
      startDate > endDate ||
      endDate > returnDate
    ) {
      return null;
    }
    parsed.push({ city, startDate, endDate });
    earliestStart = endDate;
  }
  return parsed;
}

export function parseOnboardingInput(
  raw: unknown,
  now: Date = new Date(),
): ParseResult {
  if (!isRecord(raw)) return { ok: false, error: "invalid_input" };

  const {
    city,
    passport,
    travelers,
    disabilityNotes,
    departureDate,
    returnDate,
    legs,
  } = raw;
  let { year, month } = raw;

  if (!isOneOf(onboardingCities, city)) {
    return { ok: false, error: "invalid_city" };
  }

  let dates: Pick<OnboardingInput, "departureDate" | "returnDate" | "legs"> = {
    departureDate: null,
    returnDate: null,
    legs: [],
  };
  if (departureDate === undefined || departureDate === null) {
    if (!isAbsent(returnDate) || !isAbsent(legs)) {
      return { ok: false, error: "invalid_date" };
    }
  } else {
    if (!isIsoDate(departureDate)) {
      return { ok: false, error: "invalid_date" };
    }
    // Dated input: the travel month comes from the date, raw year/month are ignored.
    [year, month] = departureDate.split("-").map(Number);
  }

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    (month as number) < 1 ||
    (month as number) > 12 ||
    !isWithinTravelRange(
      { year: year as number, month: month as number },
      currentYearMonth(now),
    )
  ) {
    return { ok: false, error: "invalid_date" };
  }

  if (typeof departureDate === "string") {
    if (!isIsoDate(returnDate) || returnDate < departureDate) {
      return { ok: false, error: "invalid_return_date" };
    }
    const parsedLegs = parseLegs(legs, departureDate, returnDate);
    if (!parsedLegs) return { ok: false, error: "invalid_legs" };
    dates = { departureDate, returnDate, legs: parsedLegs };
  }

  if (!isOneOf(passportStatuses, passport)) {
    return { ok: false, error: "invalid_passport" };
  }

  if (
    !Array.isArray(travelers) ||
    travelers.length < 1 ||
    travelers.length > maxTravelers
  ) {
    return { ok: false, error: "invalid_travelers" };
  }

  const parsedTravelers: OnboardingTraveler[] = [];
  for (const traveler of travelers) {
    if (!isRecord(traveler)) return { ok: false, error: "invalid_travelers" };
    const { name, isMinor, hasDisability } = traveler;
    if (typeof name !== "string" || !isValidTravelerName(name)) {
      return { ok: false, error: "invalid_name" };
    }
    if (typeof isMinor !== "boolean" || typeof hasDisability !== "boolean") {
      return { ok: false, error: "invalid_flags" };
    }
    parsedTravelers.push({ name: name.trim(), isMinor, hasDisability });
  }

  let notes: string | null = null;
  if (disabilityNotes !== undefined && disabilityNotes !== null) {
    if (typeof disabilityNotes !== "string") {
      return { ok: false, error: "invalid_notes" };
    }
    const trimmed = disabilityNotes.trim();
    if (trimmed.length > maxNotesLength) {
      return { ok: false, error: "invalid_notes" };
    }
    notes = trimmed || null;
  }

  return {
    ok: true,
    value: {
      city,
      year: year as number,
      month: month as number,
      ...dates,
      passport,
      travelers: parsedTravelers,
      disabilityNotes: parsedTravelers.some((t) => t.hasDisability)
        ? notes
        : null,
    },
  };
}
