import { describe, expect, it } from "vitest";
import { maxFlagReasonLength, parseFlagReason } from "./flags";

describe("parseFlagReason", () => {
  it("allows 500 characters", () => {
    expect(maxFlagReasonLength).toBe(500);
  });

  it("trims and accepts 1 to 500 characters", () => {
    expect(parseFlagReason("  Biaya visa sudah naik \n")).toEqual({
      ok: true,
      reason: "Biaya visa sudah naik",
    });
    expect(parseFlagReason("a")).toEqual({ ok: true, reason: "a" });
    const longest = "a".repeat(500);
    expect(parseFlagReason(` ${longest} `)).toEqual({
      ok: true,
      reason: longest,
    });
  });

  it.each(["", "   ", "\n\t "])("rejects empty input %j", (raw) => {
    expect(parseFlagReason(raw)).toEqual({ ok: false, error: "empty" });
  });

  it("rejects non-string input as empty", () => {
    expect(parseFlagReason(undefined)).toEqual({ ok: false, error: "empty" });
    expect(parseFlagReason(42)).toEqual({ ok: false, error: "empty" });
  });

  it("rejects 501 characters without echoing the input", () => {
    const result = parseFlagReason("x".repeat(501));
    expect(result).toEqual({ ok: false, error: "tooLong" });
    expect(JSON.stringify(result)).not.toContain("xx");
  });
});
