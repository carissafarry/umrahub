import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import type { StepStatus } from "@/lib/trips/checklist";
import { StepAccordion } from "./StepAccordion";

vi.mock("@/lib/trips/actions", () => ({ updateStepStatus: vi.fn() }));

const stepId = "5eed0000-0000-4000-8000-000000000009";

function render(status: StepStatus, locale: "id" | "en" = "id") {
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
        status={status}
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
    expect(render("in_progress")).toContain("bg-tile-amber");
    const done = render("completed", "en");
    expect(done).toContain("bg-tile-green");
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
});
