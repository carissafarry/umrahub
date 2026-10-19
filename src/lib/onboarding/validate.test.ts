import { describe, expect, it } from "vitest";
import { parseOnboardingInput } from "./validate";

// Server clock for every case: 19 October 2026 (range Oct 2026 – Oct 2028).
const now = new Date(2026, 9, 19);

const traveler = (name: string, extra: object = {}) => ({
  name,
  isMinor: false,
  hasDisability: false,
  ...extra,
});

const valid = {
  city: "Jakarta",
  year: 2027,
  month: 3,
  passport: "valid",
  travelers: [traveler("Siti Aminah")],
  disabilityNotes: null,
};

const parse = (overrides: object) =>
  parseOnboardingInput({ ...valid, ...overrides }, now);

describe("parseOnboardingInput", () => {
  it("accepts a valid input and trims names", () => {
    const result = parse({
      travelers: [traveler("  Siti Aminah "), traveler("Budi", { isMinor: true })],
    });
    expect(result).toEqual({
      ok: true,
      value: {
        city: "Jakarta",
        year: 2027,
        month: 3,
        passport: "valid",
        travelers: [
          { name: "Siti Aminah", isMinor: false, hasDisability: false },
          { name: "Budi", isMinor: true, hasDisability: false },
        ],
        disabilityNotes: null,
      },
    });
  });

  it("ignores unknown extra fields", () => {
    const result = parse({ user_id: "someone-else", extra: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).not.toHaveProperty("user_id");
  });

  it.each([null, "text", 42, []])("rejects a non-object input %j", (raw) => {
    expect(parseOnboardingInput(raw, now)).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });

  it.each(["Jakarta", "Surabaya", "Medan", "Makassar", "Yogyakarta"])(
    "accepts the override city %s",
    (city) => {
      expect(parse({ city }).ok).toBe(true);
    },
  );

  it.each(["Bandung", "jakarta", "", undefined, 1])(
    "rejects a non-listed city %j",
    (city) => {
      expect(parse({ city })).toEqual({ ok: false, error: "invalid_city" });
    },
  );

  it("accepts the current month and the month 24 months ahead", () => {
    expect(parse({ year: 2026, month: 10 }).ok).toBe(true);
    expect(parse({ year: 2028, month: 10 }).ok).toBe(true);
  });

  it("rejects a past month", () => {
    expect(parse({ year: 2026, month: 9 })).toEqual({
      ok: false,
      error: "invalid_date",
    });
  });

  it("rejects a month beyond +24 months", () => {
    expect(parse({ year: 2028, month: 11 })).toEqual({
      ok: false,
      error: "invalid_date",
    });
  });

  it.each([
    { month: 0 },
    { month: 13 },
    { month: 3.5 },
    { month: "3" },
    { year: 2027.5 },
    { year: "2027" },
    { year: undefined },
  ])("rejects a bad month or year %j", (date) => {
    expect(parse(date)).toEqual({ ok: false, error: "invalid_date" });
  });

  it.each(["valid", "expired", "none"])("accepts passport %s", (passport) => {
    expect(parse({ passport }).ok).toBe(true);
  });

  it.each(["lost", "", null, true])("rejects a bad passport value %j", (passport) => {
    expect(parse({ passport })).toEqual({
      ok: false,
      error: "invalid_passport",
    });
  });

  it("accepts 10 travelers", () => {
    const travelers = Array.from({ length: 10 }, (_, i) => traveler(`T${i}`));
    expect(parse({ travelers }).ok).toBe(true);
  });

  it("rejects 11 travelers", () => {
    const travelers = Array.from({ length: 11 }, (_, i) => traveler(`T${i}`));
    expect(parse({ travelers })).toEqual({
      ok: false,
      error: "invalid_travelers",
    });
  });

  it.each([[], "Siti", null, [null], ["Siti"]])(
    "rejects a bad travelers value %j",
    (travelers) => {
      expect(parse({ travelers })).toEqual({
        ok: false,
        error: "invalid_travelers",
      });
    },
  );

  it("accepts an 80-char name", () => {
    expect(parse({ travelers: [traveler("a".repeat(80))] }).ok).toBe(true);
  });

  it("rejects an 81-char name", () => {
    expect(parse({ travelers: [traveler("a".repeat(81))] })).toEqual({
      ok: false,
      error: "invalid_name",
    });
  });

  it.each(["", "   ", "\n\t "])("rejects a whitespace-only name %j", (name) => {
    expect(parse({ travelers: [traveler(name)] })).toEqual({
      ok: false,
      error: "invalid_name",
    });
  });

  it("rejects a non-string name", () => {
    expect(parse({ travelers: [traveler(42 as unknown as string)] })).toEqual({
      ok: false,
      error: "invalid_name",
    });
  });

  it.each([
    { isMinor: "yes" },
    { hasDisability: 1 },
    { isMinor: undefined },
    { hasDisability: null },
  ])("rejects non-boolean flags %j", (flags) => {
    expect(parse({ travelers: [traveler("Siti", flags)] })).toEqual({
      ok: false,
      error: "invalid_flags",
    });
  });

  it("keeps trimmed notes when a traveler has a disability", () => {
    const result = parse({
      travelers: [traveler("Siti", { hasDisability: true })],
      disabilityNotes: "  Needs a wheelchair  ",
    });
    expect(result.ok && result.value.disabilityNotes).toBe("Needs a wheelchair");
  });

  it("accepts 500-char notes and stores blank notes as null", () => {
    const travelers = [traveler("Siti", { hasDisability: true })];
    const long = parse({ travelers, disabilityNotes: "a".repeat(500) });
    expect(long.ok && long.value.disabilityNotes).toHaveLength(500);
    const blank = parse({ travelers, disabilityNotes: "   " });
    expect(blank.ok && blank.value.disabilityNotes).toBeNull();
  });

  it("rejects notes over 500 chars", () => {
    expect(
      parse({
        travelers: [traveler("Siti", { hasDisability: true })],
        disabilityNotes: "a".repeat(501),
      }),
    ).toEqual({ ok: false, error: "invalid_notes" });
  });

  it("rejects non-string notes", () => {
    expect(
      parse({
        travelers: [traveler("Siti", { hasDisability: true })],
        disabilityNotes: 5,
      }),
    ).toEqual({ ok: false, error: "invalid_notes" });
  });

  it("drops notes when no traveler has a disability", () => {
    const result = parse({ disabilityNotes: "Needs a wheelchair" });
    expect(result).toMatchObject({ ok: true, value: { disabilityNotes: null } });
  });

  it("does not echo submitted names or notes in error results", () => {
    const secretName = "Rahasia Nama Jemaah";
    const secretNotes = "Catatan medis rahasia";
    const failures = [
      parse({ city: secretName }),
      parse({
        travelers: [traveler(secretName, { hasDisability: true })],
        disabilityNotes: secretNotes.repeat(30),
      }),
      parse({ travelers: [traveler(`${secretName}${"x".repeat(80)}`)] }),
      parse({ travelers: [traveler(secretName, { isMinor: secretNotes })] }),
    ];
    for (const result of failures) {
      expect(result.ok).toBe(false);
      const text = JSON.stringify(result);
      expect(text).not.toContain(secretName);
      expect(text).not.toContain(secretNotes);
    }
  });
});
