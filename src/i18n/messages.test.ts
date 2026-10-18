import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import id from "../../messages/id.json";
import { resolveLocale } from "./config";

function flattenKeys(node: object, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? flattenKeys(value, path)
      : [path];
  });
}

// Built from parts so `grep -rn` for these spellings in src/ stays empty.
const englishSpelling = "Umr" + "ah";
const retiredBrand = "Umroh" + "Hub";

describe("message files", () => {
  it("id and en have the same keys", () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(id).sort());
  });

  it("Indonesian copy spells Umroh, never the English spelling", () => {
    expect(JSON.stringify(id)).not.toContain(englishSpelling);
  });

  it("no message uses the retired brand name", () => {
    expect(JSON.stringify(id)).not.toContain(retiredBrand);
    expect(JSON.stringify(en)).not.toContain(retiredBrand);
  });
});

describe("resolveLocale", () => {
  it.each([undefined, "", "fr", "EN-us", "%%%garbage"])(
    "falls back to id for %s",
    (value) => {
      expect(resolveLocale(value)).toBe("id");
    },
  );

  it("keeps supported locales", () => {
    expect(resolveLocale("id")).toBe("id");
    expect(resolveLocale("en")).toBe("en");
  });
});
