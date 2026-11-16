// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import id from "../../../messages/id.json";
import type { ProviderProfileData } from "@/lib/providers/queries";
import { ProviderProfile } from "./ProviderProfile";

const unverifiedText =
  "Belum diverifikasi Umra Hub. Periksa sendiri sebelum membayar.";

const base: ProviderProfileData = {
  id: "d0000000-0000-4000-8000-020000000001",
  providerType: "muthawif",
  name: "Ustadz Ahmad",
  bioId: "Bio muthawif",
  bioEn: null,
  verifiedOn: null,
  rating: null,
  affiliations: [],
  catalog: [],
  reviews: [],
  schedules: [],
  whatsappUrl: null,
  contactAvailable: false,
};

describe("ProviderProfile", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(profile: ProviderProfileData) {
    act(() =>
      root.render(
        <NextIntlClientProvider locale="id" messages={id}>
          <ProviderProfile profile={profile} />
        </NextIntlClientProvider>,
      ),
    );
  }

  it("shows the exact warning and no badge when unverified", () => {
    render(base);
    expect(container.textContent).toContain(unverifiedText);
    expect(container.querySelector('[aria-label="Terverifikasi"]')).toBeNull();
  });

  it("shows the badge and date, not the warning, when verified", () => {
    render({ ...base, verifiedOn: "2026-10-05" });
    expect(container.textContent).not.toContain(unverifiedText);
    expect(container.querySelector('[aria-label="Terverifikasi"]')).not.toBeNull();
    expect(container.textContent).toContain("terverifikasi");
    expect(container.textContent).toContain("2026");
  });

  it("shows no wa.me link and no number for a dummy provider", () => {
    render(base);
    expect(container.querySelector('a[href*="wa.me"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/wa\.me|62812/);
    expect(container.textContent).toContain(
      "Kontak WhatsApp belum tersedia untuk profil ini.",
    );
  });

  it("links to WhatsApp in a new tab for a real provider", () => {
    render({
      ...base,
      whatsappUrl: "https://wa.me/628123456789",
      contactAvailable: true,
    });
    const link = container.querySelector<HTMLAnchorElement>('a[href*="wa.me"]');
    expect(link?.getAttribute("href")).toBe("https://wa.me/628123456789");
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toBe("noopener noreferrer");
    expect(link?.textContent).toContain("Hubungi lewat WhatsApp");
  });

  it("renders the affiliation card with a link to the travel", () => {
    render({
      ...base,
      affiliations: [
        {
          providerId: "t1",
          name: "Travel A",
          providerType: "travel",
          relationship: "works_at",
          startedYear: 2024,
          verified: true,
          rating: null,
        },
      ],
    });
    expect(container.textContent).toContain("Bekerja di · sejak 2024");
    expect(
      container.querySelector('a[href="/penyedia/t1"]')?.textContent,
    ).toContain("Travel A");
  });
});
