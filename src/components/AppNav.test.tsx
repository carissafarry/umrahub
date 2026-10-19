import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppBottomNav, AppTopNav } from "./AppNav";

const pathname = vi.hoisted(() => ({ current: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

// Echoes the message key so the markup shows which copy is used.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);

describe("AppTopNav", () => {
  it("links only to existing routes and marks the current one without indigo", async () => {
    pathname.current = "/trips/new";
    const html = renderToStaticMarkup(await AppTopNav({}));

    expect(html).toMatch(/^<nav aria-label="Navigation.label" class="hidden lg:flex/);
    expect(hrefs(html)).toEqual(["/dashboard", "/trips/new"]);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    const current = html.match(/<a [^>]*aria-current="page"[^>]*>/)![0];
    expect(current).toContain('href="/trips/new"');
    expect(html).not.toContain("bg-primary");
    expect(html.match(/tap-target/g)).toHaveLength(2);
  });
});

describe("AppBottomNav", () => {
  it("renders the same tabs with the given active tab and label", async () => {
    const html = renderToStaticMarkup(
      await AppBottomNav({ activeHref: "/dashboard" }),
    );
    expect(html).toContain('aria-label="Navigation.label"');
    expect(hrefs(html)).toEqual(["/dashboard", "/trips/new"]);
    expect(html).toMatch(/aria-label="Navigation.home" aria-current="page"/);
    expect(html).toContain("lg:hidden");
  });
});
