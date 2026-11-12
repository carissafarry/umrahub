// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BottomNav, type BottomNavItem } from "./BottomNav";
import { Button, ButtonLink, GoogleButton } from "./Button";
import { Card } from "./Card";
import { Chip } from "./Chip";
import { IconButton } from "./IconButton";
import { HomeIcon } from "./icons";

describe("ui primitives", () => {
  it("Button renders a type=button with its label", () => {
    const html = renderToStaticMarkup(<Button>Masuk dengan Google</Button>);
    expect(html).toMatch(/^<button[^>]*type="button"/);
    expect(html).toContain("Masuk dengan Google");
  });

  it("ButtonLink renders a link with the same classes and badge as Button", () => {
    const link = renderToStaticMarkup(
      <ButtonLink href="/trips/new">Buat trip baru</ButtonLink>,
    );
    const button = renderToStaticMarkup(<Button>Buat trip baru</Button>);
    expect(link).toMatch(/^<a[^>]*href="\/trips\/new"/);
    const classes = (html: string) => html.match(/class="([^"]*)"/)![1];
    expect(classes(link)).toBe(classes(button));
    expect(link.replace(/^<a[^>]*>/, "")).toBe(
      button.replace(/^<button[^>]*>/, "").replace(/<\/button>$/, "</a>"),
    );
  });

  it("GoogleButton is a submit button with a centred label and the G badge on the left, no arrow", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <GoogleButton type="submit">Masuk dengan Google</GoogleButton>,
    );
    const button = container.querySelector("button")!;
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.textContent).toBe("Masuk dengan Google");
    expect(button.className).toContain("justify-center");

    const badges = button.querySelectorAll('span[aria-hidden="true"]');
    expect(badges).toHaveLength(1);
    expect(badges[0].className).toContain("left-1.5");
    expect(badges[0].className).toContain("bg-primary-foreground");
    expect(badges[0].querySelectorAll("svg path")).toHaveLength(4);

    // The arrow badge sits on the right; Button keeps it, GoogleButton has none.
    const arrow = document.createElement("div");
    arrow.innerHTML = renderToStaticMarkup(<Button>Lanjut</Button>);
    const arrowBadge = arrow.querySelector('span[aria-hidden="true"]')!;
    expect(arrowBadge.className).toContain("right-2");
    expect(button.querySelector(".right-2")).toBeNull();
  });

  it("IconButton uses label as aria-label", () => {
    const html = renderToStaticMarkup(
      <IconButton label="Pengaturan">
        <HomeIcon />
      </IconButton>,
    );
    expect(html).toContain('aria-label="Pengaturan"');
  });

  it("selected Chip sets aria-pressed", () => {
    const html = renderToStaticMarkup(<Chip selected>Hari ini</Chip>);
    expect(html).toContain('aria-pressed="true"');
  });

  it("BottomNav marks only the active item with aria-current", () => {
    const item = (href: string, label: string): BottomNavItem => ({
      href,
      label,
      icon: <HomeIcon />,
    });
    const html = renderToStaticMarkup(
      <BottomNav
        items={[item("/", "Beranda"), item("/checklist", "Checklist")]}
        activeHref="/checklist"
      />,
    );
    const current = (html.match(/<a [^>]*>/g) ?? []).filter((tag) =>
      tag.includes('aria-current="page"'),
    );
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/checklist"');
  });

  it("BottomNav shows each item's label as visible text", () => {
    const item = (href: string, label: string): BottomNavItem => ({
      href,
      label,
      icon: <HomeIcon />,
    });
    const html = renderToStaticMarkup(
      <BottomNav
        items={[item("/", "Beranda"), item("/checklist", "Checklist")]}
        activeHref="/"
      />,
    );
    const links = html.match(/<a [^>]*>.*?<\/a>/g) ?? [];
    expect(links).toHaveLength(2);
    expect(links[0]).toMatch(/<\/span>Beranda<\/a>$/);
    expect(links[1]).toMatch(/<\/span>Checklist<\/a>$/);
    expect(html).not.toContain("aria-label=\"Beranda\"");
  });

  it("Card has a surface line and no shadow", () => {
    const html = renderToStaticMarkup(<Card>Isi</Card>);
    expect(html).toContain("border-surface-line");
    expect(html).not.toContain("shadow-card");
  });

  it("Chip is bordered when unselected and ink when selected", () => {
    expect(renderToStaticMarkup(<Chip>Jakarta</Chip>)).toContain(
      "border-border",
    );
    expect(renderToStaticMarkup(<Chip selected>Jakarta</Chip>)).toContain(
      "bg-primary",
    );
  });

  it("BottomNav items type rejects a fifth item", () => {
    const item: BottomNavItem = { href: "/", label: "Beranda", icon: null };
    const render = () => (
      // @ts-expect-error BottomNav accepts at most 4 items
      <BottomNav items={[item, item, item, item, item]} activeHref="/" />
    );
    expect(render).toBeTypeOf("function");
  });
});
