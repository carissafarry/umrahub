import { describe, expect, it } from "vitest";
import {
  addDays,
  dateStepError,
  lastTravelDate,
  legsPayload,
  localIsoDate,
  tripLength,
  type LegDates,
} from "./dates";
import { parseOnboardingInput, type TripLegCity } from "./validate";

const first = { year: 2027, month: 1 };
const now = new Date(2027, 0, 5, 9);
const empty = { startDate: "", endDate: "" };
const legs = (
  makkah: LegDates = empty,
  madinah: LegDates = empty,
): Record<TripLegCity, LegDates> => ({ Makkah: makkah, Madinah: madinah });

describe("date helpers", () => {
  it("does day arithmetic on YYYY-MM-DD strings", () => {
    expect(addDays("2027-01-12", 10)).toBe("2027-01-22");
    expect(addDays("2027-01-28", 8)).toBe("2027-02-05");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(tripLength("2027-01-12", "2027-01-22")).toBe(11);
    expect(tripLength("2027-03-28", "2027-04-02")).toBe(6);
    expect(localIsoDate(now)).toBe("2027-01-05");
  });

  it("ends the window on the last day of the +24th month", () => {
    expect(lastTravelDate(first)).toBe("2029-01-31");
    expect(lastTravelDate({ year: 2026, month: 12 })).toBe("2028-12-31");
  });
});

describe("dateStepError", () => {
  const check = (dep: string, ret: string, l = legs({ startDate: dep, endDate: ret }), f = first) =>
    dateStepError(dep, ret, l, f);

  it("requires a departure date within the travel window", () => {
    expect(check("", "")).toBe("date");
    expect(check("2026-12-31", "2027-01-10")).toBe("date");
    expect(check("2029-02-01", "2029-02-10")).toBe("date");
    expect(check("2029-01-31", "2029-02-10")).toBeNull();
  });

  it("requires a return date on or after the departure", () => {
    expect(check("2027-01-12", "", legs())).toBe("returnDate");
    expect(check("2027-01-12", "2027-01-11", legs())).toBe("returnDate");
    expect(check("2027-01-12", "2027-01-12")).toBeNull();
  });

  it("requires at least one city with both dates", () => {
    expect(check("2027-01-12", "2027-01-22", legs())).toBe("legsMissing");
    expect(
      check("2027-01-12", "2027-01-22", legs({ startDate: "2027-01-12", endDate: "" })),
    ).toBe("legs");
    expect(
      check("2027-01-12", "2027-01-22", legs(empty, { startDate: "2027-01-12", endDate: "2027-01-16" })),
    ).toBeNull();
  });

  it("keeps legs inside the trip and in order", () => {
    const trip = ["2027-01-12", "2027-01-22"] as const;
    // Makkah before departure, after return, end before start.
    expect(check(...trip, legs({ startDate: "2027-01-11", endDate: "2027-01-15" }))).toBe("legs");
    expect(check(...trip, legs({ startDate: "2027-01-12", endDate: "2027-01-23" }))).toBe("legs");
    expect(check(...trip, legs({ startDate: "2027-01-15", endDate: "2027-01-14" }))).toBe("legs");
    // Madinah starting before Makkah ends.
    expect(
      check(
        ...trip,
        legs(
          { startDate: "2027-01-12", endDate: "2027-01-17" },
          { startDate: "2027-01-16", endDate: "2027-01-22" },
        ),
      ),
    ).toBe("legs");
    // Touching days are allowed.
    expect(
      check(
        ...trip,
        legs(
          { startDate: "2027-01-12", endDate: "2027-01-17" },
          { startDate: "2027-01-17", endDate: "2027-01-22" },
        ),
      ),
    ).toBeNull();
  });
});

describe("dated payload", () => {
  const base = {
    city: "Jakarta",
    passport: "valid",
    travelers: [{ name: "Budi", isMinor: false, hasDisability: false }],
    disabilityNotes: null,
  };

  it("passes parseOnboardingInput whenever the step accepts it", () => {
    const cases: [string, string, Record<TripLegCity, LegDates>][] = [
      ["2027-01-12", "2027-01-22", legs({ startDate: "2027-01-12", endDate: "2027-01-17" }, { startDate: "2027-01-17", endDate: "2027-01-22" })],
      ["2027-01-12", "2027-01-22", legs(empty, { startDate: "2027-01-13", endDate: "2027-01-20" })],
      ["2029-01-31", "2029-02-09", legs({ startDate: "2029-02-01", endDate: "2029-02-08" })],
    ];
    for (const [departureDate, returnDate, cityDates] of cases) {
      expect(dateStepError(departureDate, returnDate, cityDates, first)).toBeNull();
      const result = parseOnboardingInput(
        { ...base, departureDate, returnDate, legs: legsPayload(cityDates) },
        now,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.departureDate).toBe(departureDate);
        expect(result.value.returnDate).toBe(returnDate);
        expect(result.value.legs).toEqual(legsPayload(cityDates));
      }
    }
  });

  it("omits empty city rows and keeps Makkah before Madinah", () => {
    expect(legsPayload(legs())).toEqual([]);
    expect(
      legsPayload(
        legs(
          { startDate: "2027-01-12", endDate: "2027-01-17" },
          { startDate: "2027-01-17", endDate: "2027-01-22" },
        ),
      ).map((leg) => leg.city),
    ).toEqual(["Makkah", "Madinah"]);
  });
});
