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

const current = (html: string) => {
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  return html.match(/<a [^>]*aria-current="page"[^>]*>.*?<\/a>/)![0];
};

describe("AppTopNav", () => {
  it("links only to Beranda and Trip and marks the current one without ink", async () => {
    pathname.current = "/trips";
    const html = renderToStaticMarkup(await AppTopNav({}));

    expect(html).toMatch(/^<nav aria-label="Navigation.label" class="hidden lg:flex/);
    expect(hrefs(html)).toEqual(["/dashboard", "/trips"]);
    expect(current(html)).toContain('href="/trips"');
    expect(html).not.toContain("bg-primary");
    expect(html.match(/tap-target/g)).toHaveLength(2);
  });

  it.each(["/trips/new", "/trips/abc", "/trips/abc/budget"])(
    "keeps Trip current under %s",
    async (path) => {
      pathname.current = path;
      const html = renderToStaticMarkup(await AppTopNav({}));
      expect(current(html)).toMatch(/href="\/trips".*>Navigation\.trips<\/a>$/);
    },
  );

  it("marks Beranda current only on /dashboard", async () => {
    pathname.current = "/dashboard";
    expect(current(renderToStaticMarkup(await AppTopNav({})))).toContain(
      'href="/dashboard"',
    );
    pathname.current = "/tripsx";
    const html = renderToStaticMarkup(await AppTopNav({}));
    expect(html).not.toContain('aria-current="page"');
  });
});

describe("AppBottomNav", () => {
  it("renders the same tabs with the given active tab and label", async () => {
    const html = renderToStaticMarkup(
      await AppBottomNav({ activeHref: "/dashboard" }),
    );
    expect(html).toContain('aria-label="Navigation.label"');
    expect(hrefs(html)).toEqual(["/dashboard", "/trips"]);
    const tab = current(html);
    expect(tab).toContain('href="/dashboard"');
    expect(tab).toMatch(/>Navigation\.home<\/a>$/);
    expect(html).toContain("lg:hidden");
  });

  it("marks Trip as the ink tab on /trips", async () => {
    const html = renderToStaticMarkup(
      await AppBottomNav({ activeHref: "/trips" }),
    );
    const tab = current(html);
    expect(tab).toContain('href="/trips"');
    expect(tab).toContain("bg-primary");
    expect(tab).toMatch(/>Navigation\.trips<\/a>$/);
  });
});
