import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import type { StepStatus, TrackingMode } from "@/lib/trips/checklist";
import { StepAccordion, type TravelerStepStatus } from "./StepAccordion";

vi.mock("@/lib/trips/actions", () => ({
  updateStepStatus: vi.fn(),
  updateStepTrackingMode: vi.fn(),
}));

const stepId = "5eed0000-0000-4000-8000-000000000009";

const ahmad = "aaaaaaaa-0000-4000-8000-000000000001";
const siti = "aaaaaaaa-0000-4000-8000-000000000002";

function render(
  status: StepStatus,
  locale: "id" | "en" = "id",
  prerequisites: string[] = [],
  trackingMode: TrackingMode = "shared",
  travelers: TravelerStepStatus[] = [],
) {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "id" ? id : en}
      timeZone="Asia/Jakarta"
    >
      <StepAccordion
        tripId="11111111-1111-4111-8111-111111111111"
        stepId={stepId}
        title="Pesan tiket pesawat"
        summary="Pesan tiket pulang-pergi."
        cost={{
          key: "range",
          values: { min: "Rp 10.000.000", max: "Rp 16.000.000" },
        }}
        trackingMode={trackingMode}
        status={status}
        travelers={travelers}
        prerequisites={prerequisites}
      />
    </NextIntlClientProvider>,
  );
}

describe("StepAccordion", () => {
  it("renders a collapsed header button that controls the panel", () => {
    const html = render("not_started");
    const button = html.match(/<button[^>]*aria-expanded[^>]*>/)?.[0] ?? "";
    expect(button).toContain('type="button"');
    expect(button).toContain('aria-expanded="false"');
    expect(button).toContain("tap-target");
    const controls = button.match(/aria-controls="([^"]+)"/)?.[1];
    expect(controls).toBeTruthy();
    expect(html).toMatch(new RegExp(`<div id="${controls}" hidden=""`));
    expect(html).toMatch(/<h4><button/);
  });

  it("shows the status as badge text", () => {
    expect(render("not_started")).toContain("Belum mulai");
    expect(render("in_progress")).toContain("bg-warning-soft");
    const done = render("completed", "en");
    expect(done).toContain("bg-success-soft");
    expect(done).toContain(">Done</span>");
  });

  it("puts cost per person and the status control in the panel", () => {
    const html = render("completed");
    expect(html).toContain("Rp 10.000.000 – Rp 16.000.000");
    expect(html).toContain("per orang");
    expect(html).toContain(
      'role="radiogroup" aria-label="Status langkah: Pesan tiket pesawat"',
    );
    expect(html).toMatch(/aria-checked="true"[^>]*>Selesai</);
  });

  describe("tracking mode", () => {
    const pair = (a: StepStatus, b: StepStatus): TravelerStepStatus[] => [
      { id: ahmad, name: "Ahmad", status: a },
      { id: siti, name: "Siti", status: b },
    ];
    const radiogroups = (html: string) =>
      [...html.matchAll(/role="radiogroup" aria-label="([^"]+)"/g)].map(
        ([, label]) => label,
      );
    const badge = (html: string) =>
      html.match(/<button[^>]*aria-expanded[^>]*>.*?<\/button>/)?.[0] ?? "";

    it("renders a tracking-mode radiogroup with Bersama and Per jamaah", () => {
      const html = render(
        "not_started",
        "id",
        [],
        "individual",
        pair("completed", "not_started"),
      );
      const group =
        html.match(
          /<div role="radiogroup" aria-label="Pencatatan status: Pesan tiket pesawat"[^>]*>.*?<\/div>/,
        )?.[0] ?? "";
      expect(group).toMatch(/aria-checked="false"[^>]*>Bersama</);
      expect(group).toMatch(/aria-checked="true"[^>]*>Per jamaah</);
      expect(group).toContain("tap-target");

      const en = render("not_started", "en", [], "shared", []);
      expect(en).toMatch(/aria-checked="true"[^>]*>Shared</);
      expect(en).toMatch(/aria-checked="false"[^>]*>Per traveler</);
    });

    it("renders one status radiogroup per traveler, named after each", () => {
      const html = render(
        "not_started",
        "id",
        [],
        "individual",
        pair("completed", "not_started"),
      );
      const statusGroups = radiogroups(html).filter(
        (label) => !label.startsWith("Pencatatan"),
      );
      expect(statusGroups).toEqual([
        "Status Ahmad: Pesan tiket pesawat",
        "Status Siti: Pesan tiket pesawat",
      ]);
      expect(html).toContain(">Ahmad</p>");
      expect(html).toContain(">Siti</p>");
      // Names come before their own control, in loader order.
      expect(html.indexOf(">Ahmad</p>")).toBeLessThan(
        html.indexOf("Status Ahmad"),
      );
      expect(html.indexOf("Status Ahmad")).toBeLessThan(
        html.indexOf(">Siti</p>"),
      );
    });

    it("renders a shared step with one status radiogroup", () => {
      const html = render(
        "in_progress",
        "id",
        [],
        "shared",
        pair("completed", "completed"),
      );
      expect(radiogroups(html)).toEqual([
        "Status langkah: Pesan tiket pesawat",
        "Pencatatan status: Pesan tiket pesawat",
      ]);
      expect(html).not.toContain("Ahmad");
      expect(badge(html)).toContain("Sedang dikerjakan");
    });

    it("keeps the single control for an individual step without travelers", () => {
      const html = render("completed", "id", [], "individual", []);
      expect(radiogroups(html)).toEqual([
        "Status langkah: Pesan tiket pesawat",
        "Pencatatan status: Pesan tiket pesawat",
      ]);
      expect(badge(html)).toContain(">Selesai</span>");
    });

    it("shows the aggregate status in the header", () => {
      expect(
        badge(
          render(
            "completed",
            "id",
            [],
            "individual",
            pair("completed", "not_started"),
          ),
        ),
      ).toContain(">Sedang dikerjakan</span>");
      expect(
        badge(
          render(
            "not_started",
            "id",
            [],
            "individual",
            pair("completed", "completed"),
          ),
        ),
      ).toContain(">Selesai</span>");
      expect(
        badge(
          render(
            "completed",
            "id",
            [],
            "individual",
            pair("not_started", "not_started"),
          ),
        ),
      ).toContain(">Belum mulai</span>");
    });

    it("marks a per-traveler step blocked until everyone is done", () => {
      const titles = ["Paspor"];
      expect(
        badge(
          render(
            "completed",
            "id",
            titles,
            "individual",
            pair("completed", "in_progress"),
          ),
        ),
      ).toContain("Menunggu langkah lain");
      expect(
        badge(
          render(
            "not_started",
            "id",
            titles,
            "individual",
            pair("completed", "completed"),
          ),
        ),
      ).not.toContain("Menunggu langkah lain");
    });

    it("renders traveler names as text, never HTML", () => {
      const html = render("not_started", "id", [], "individual", [
        { id: ahmad, name: "<b>Ahmad</b>", status: "not_started" },
      ]);
      expect(html).not.toContain("<b>Ahmad</b>");
      expect(html).toContain("&lt;b&gt;Ahmad&lt;/b&gt;");
    });
  });

  describe("prerequisites", () => {
    const copy = {
      id: {
        titles: ["Paspor", "Vaksin meningitis"],
        marker: "Menunggu langkah lain",
        line: "Disarankan selesai dulu: Paspor dan Vaksin meningitis",
      },
      en: {
        titles: ["Passport", "Meningitis vaccine"],
        marker: "Waiting on another step",
        line: "Recommended first: Passport and Meningitis vaccine",
      },
    } as const;

    for (const locale of ["id", "en"] as const) {
      const { titles, marker, line } = copy[locale];

      it(`marks a blocked step in the header and panel (${locale})`, () => {
        for (const status of ["not_started", "in_progress"] as const) {
          const html = render(status, locale, [...titles]);
          const button =
            html.match(/<button[^>]*aria-expanded[^>]*>.*?<\/button>/)?.[0] ??
            "";
          expect(button).toMatch(
            new RegExp(`<svg[^>]*aria-hidden="true"[^>]*>.*?</svg>${marker}<`),
          );
          expect(button).toContain("bg-dusk-tile");
          expect(button).not.toContain("bg-primary");
          const panel = html.slice(html.indexOf('<div id="step-panel-'));
          expect(panel).toContain(line);
          // The status control is never disabled.
          expect(panel).not.toContain("disabled");
        }
      });

      it(`renders no marker when unblocked (${locale})`, () => {
        for (const html of [
          render("not_started", locale),
          render("completed", locale, [...titles]),
        ]) {
          expect(html).not.toContain(marker);
          expect(html).not.toContain(line);
          expect(html).not.toContain('role="status"');
        }
      });
    }
  });

  it("links the panel to the step detail page with the trip", () => {
    const href =
      'href="/steps/5eed0000-0000-4000-8000-000000000009?trip=11111111-1111-4111-8111-111111111111"';
    for (const [locale, text, label] of [
      ["id", "Pelajari lebih lanjut", "Pelajari lebih lanjut: Pesan tiket pesawat"],
      ["en", "Learn more", "Learn more: Pesan tiket pesawat"],
    ] as const) {
      const html = render("not_started", locale);
      const link = html.match(/<a [^>]*>.*?<\/a>/)?.[0] ?? "";
      expect(link).toContain(href);
      expect(link).toContain(`aria-label="${label}"`);
      expect(link).toContain("tap-target");
      expect(link).toContain("text-primary");
      expect(link).toMatch(new RegExp(`>${text}<svg[^>]*aria-hidden="true"`));
      // Inside the panel, after the cost and the status control.
      const panel = html.slice(html.indexOf('<div id="step-panel-'));
      expect(panel.indexOf(href)).toBeGreaterThan(panel.indexOf("per "));
      expect(panel.indexOf(href)).toBeGreaterThan(panel.indexOf('role="radiogroup"'));
    }
  });
});
