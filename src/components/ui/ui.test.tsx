import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BottomNav, type BottomNavItem } from "./BottomNav";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { IconButton } from "./IconButton";
import { HomeIcon } from "./icons";

describe("ui primitives", () => {
  it("Button renders a type=button with its label", () => {
    const html = renderToStaticMarkup(<Button>Masuk dengan Google</Button>);
    expect(html).toMatch(/^<button[^>]*type="button"/);
    expect(html).toContain("Masuk dengan Google");
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

  it("BottomNav items type rejects a fifth item", () => {
    const item: BottomNavItem = { href: "/", label: "Beranda", icon: null };
    const render = () => (
      // @ts-expect-error BottomNav accepts at most 4 items
      <BottomNav items={[item, item, item, item, item]} activeHref="/" />
    );
    expect(render).toBeTypeOf("function");
  });
});
