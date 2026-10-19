import { describe, expect, it } from "vitest";
import { maxTripNameLength, maxTripsPerUser, parseTripName } from "./validate";

describe("parseTripName", () => {
  it("returns the trimmed name", () => {
    expect(parseTripName("  Umrah keluarga  ")).toEqual({
      ok: true,
      value: "Umrah keluarga",
    });
  });

  it("accepts 80 characters, counted after trimming", () => {
    const name = "a".repeat(maxTripNameLength);
    expect(maxTripNameLength).toBe(80);
    expect(parseTripName(` ${name} `)).toEqual({ ok: true, value: name });
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", " \n\t "],
    ["81 characters", "a".repeat(81)],
  ])("rejects %s input with a fixed code", (_label, raw) => {
    expect(parseTripName(raw)).toEqual({ ok: false, error: "invalid_name" });
  });

  it.each([null, undefined, 42, ["Umrah"], { name: "Umrah" }])(
    "rejects the non-string %j",
    (raw) => {
      expect(parseTripName(raw)).toEqual({ ok: false, error: "invalid_name" });
    },
  );

  it("never echoes the input in an error", () => {
    const raw = `Rahasia ${"x".repeat(90)}`;
    expect(JSON.stringify(parseTripName(raw))).not.toContain("Rahasia");
  });
});

describe("maxTripsPerUser", () => {
  it("is 10", () => {
    expect(maxTripsPerUser).toBe(10);
  });
});
