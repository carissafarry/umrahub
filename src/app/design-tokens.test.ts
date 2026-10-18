import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

function parseTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

// Returns the body of the first `:root { ... }` block at or after `from`.
function rootBlock(from: number): string {
  const start = css.indexOf(":root", from);
  if (from === -1 || start === -1) throw new Error("Missing :root block");
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}

const themes = {
  light: parseTokens(rootBlock(0)),
  dark: parseTokens(
    rootBlock(css.indexOf("@media (prefers-color-scheme: dark)")),
  ),
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs: [string, string, number][] = [
  ["--foreground", "--surface", 7],
  ["--foreground", "--background", 7],
  ["--foreground", "--background-from", 7],
  ["--foreground", "--background-to", 7],
  ["--muted", "--surface", 4.5],
  ["--muted", "--background-from", 4.5],
  ["--muted", "--background-to", 4.5],
  ["--primary-foreground", "--primary", 4.5],
  ["--primary-foreground", "--primary-strong", 4.5],
  ["--nav-foreground", "--nav", 4.5],
  ...(["amber", "green", "blue", "violet"].map((hue) => [
    `--tile-${hue}-foreground`,
    `--tile-${hue}`,
    3,
  ]) as [string, string, number][]),
];

describe.each(Object.entries(themes))("%s theme tokens", (_, tokens) => {
  it.each(pairs)("%s on %s is at least %d:1", (fg, bg, min) => {
    expect(tokens[fg], fg).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(tokens[bg], bg).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });
});
