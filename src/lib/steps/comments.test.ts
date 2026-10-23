import { describe, expect, it } from "vitest";
import { maxCommentLength, parseCommentContent } from "./comments";

describe("parseCommentContent", () => {
  it("allows 1000 characters", () => {
    expect(maxCommentLength).toBe(1000);
  });

  it("trims and accepts 1 to 1000 characters", () => {
    expect(parseCommentContent("  Bawa fotokopi paspor \n")).toEqual({
      ok: true,
      content: "Bawa fotokopi paspor",
    });
    expect(parseCommentContent("a")).toEqual({ ok: true, content: "a" });
    const longest = "a".repeat(1000);
    expect(parseCommentContent(` ${longest} `)).toEqual({
      ok: true,
      content: longest,
    });
  });

  it("keeps inner line breaks", () => {
    expect(parseCommentContent("Satu\nDua")).toEqual({
      ok: true,
      content: "Satu\nDua",
    });
  });

  it.each(["", "   ", "\n\t "])("rejects empty input %j", (raw) => {
    expect(parseCommentContent(raw)).toEqual({ ok: false, error: "empty" });
  });

  it("rejects non-string input as empty", () => {
    expect(parseCommentContent(undefined)).toEqual({ ok: false, error: "empty" });
    expect(parseCommentContent(42)).toEqual({ ok: false, error: "empty" });
  });

  it("rejects 1001 characters without echoing the input", () => {
    const result = parseCommentContent("x".repeat(1001));
    expect(result).toEqual({ ok: false, error: "tooLong" });
    expect(JSON.stringify(result)).not.toContain("xx");
  });
});
