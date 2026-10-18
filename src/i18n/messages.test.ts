import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

// Built from parts so `grep -rni` for these spellings in src/ stays empty.
const retiredSpelling = new RegExp("umr" + "oh", "i");
const retiredBrand = "Umr" + "oh" + "Hub";

const srcDir = fileURLToPath(new URL("..", import.meta.url));
const srcFiles = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
  .map((file) => path.join(srcDir, file))
  .filter((file) => /\.(ts|tsx|css)$/.test(file));

describe("message files", () => {
  it("id and en have the same keys", () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(id).sort());
  });

  it("messages and src spell the pilgrimage Umrah, never the old spelling", () => {
    expect(JSON.stringify(id)).not.toMatch(retiredSpelling);
    expect(JSON.stringify(en)).not.toMatch(retiredSpelling);
    for (const file of srcFiles) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(retiredSpelling);
    }
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
