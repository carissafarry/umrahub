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

export type YearMonth = { year: number; month: number };

export type OnboardingTraveler = {
  name: string;
  isMinor: boolean;
  hasDisability: boolean;
};

export type OnboardingInput = {
  city: OnboardingCity;
  year: number;
  month: number;
  passport: PassportStatus;
  travelers: OnboardingTraveler[];
  disabilityNotes: string | null;
};

// Fixed codes only: errors never carry the submitted values.
export type OnboardingErrorCode =
  | "invalid_input"
  | "invalid_city"
  | "invalid_date"
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(
  options: readonly T[],
  value: unknown,
): value is T => options.includes(value as T);

export function parseOnboardingInput(
  raw: unknown,
  now: Date = new Date(),
): ParseResult {
  if (!isRecord(raw)) return { ok: false, error: "invalid_input" };

  const { city, year, month, passport, travelers, disabilityNotes } = raw;

  if (!isOneOf(onboardingCities, city)) {
    return { ok: false, error: "invalid_city" };
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
      passport,
      travelers: parsedTravelers,
      disabilityNotes: parsedTravelers.some((t) => t.hasDisability)
        ? notes
        : null,
    },
  };
}
