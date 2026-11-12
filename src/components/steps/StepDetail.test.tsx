import { createTranslator, NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import type { DetailStep, Prerequisite } from "@/lib/steps/queries";
import type { CostText } from "@/lib/trips/checklist";
import { StepDetail } from "./StepDetail";

vi.mock("@/lib/steps/actions", () => ({
  postStepComment: vi.fn(),
  deleteStepComment: vi.fn(),
  reportStepContent: vi.fn(),
}));

let locale: "id" | "en" = "id";
const messages = () => (locale === "id" ? id : en);

vi.mock("next-intl/server", () => ({
  getLocale: async () => locale,
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale,
      messages: messages(),
      namespace: namespace as "StepDetail",
    }),
}));

const tripId = "11111111-1111-4111-8111-111111111111";
const passportId = "5eed0000-0000-4000-8000-000000000001";
const trip = { id: tripId, name: "Umrah keluarga", departure_city: "Surabaya" };

const step: DetailStep = {
  id: "5eed0000-0000-4000-8000-000000000009",
  title_id: "Pesan tiket pesawat (Jeddah atau Madinah)",
  title_en: "Book flights (Jeddah or Madinah)",
  summary_id: "Pesan tiket pulang-pergi.",
  summary_en: "Book a return ticket.",
  detail_content_id: "## Langkah-langkah\n\n1. Bandingkan harga di [nusuk.sa](https://www.nusuk.sa).",
  detail_content_en: "## Steps\n\n1. Compare prices on [nusuk.sa](https://www.nusuk.sa).",
  estimated_cost_min: 9000000,
  estimated_cost_max: 18000000,
  cost_varies_by_city: true,
  dependency_step_ids: [passportId],
};

const cost: CostText = {
  key: "range",
  values: { min: "Rp 10.000.000", max: "Rp 16.000.000" },
};

const passport = {
  id: passportId,
  title_id: "Buat atau perpanjang paspor",
  title_en: "Apply for or renew your passport",
  sort_order: 10,
};

async function render(props: {
  step?: DetailStep;
  trip?: typeof trip | null;
  cost?: CostText;
  prerequisites?: Prerequisite[];
}) {
  const element = await StepDetail({
    step,
    trip: null,
    cost,
    prerequisites: [],
    comments: [],
    ...props,
  });
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={messages()}
      timeZone="Asia/Jakarta"
    >
      {element}
    </NextIntlClientProvider>,
  );
}

describe("StepDetail", () => {
  it("renders the step with a trip: back link, cost, city and statuses", async () => {
    locale = "id";
    const html = await render({
      trip,
      prerequisites: [{ ...passport, status: "completed" }],
    });
    expect(html).toMatch(
      new RegExp(`<a [^>]*href="/trips/${tripId}"[^>]*>.*?Kembali ke checklist</a>`),
    );
    expect(html).toMatch(
      /<h1[^>]*>Pesan tiket pesawat \(Jeddah atau Madinah\)<\/h1>/,
    );
    expect(html).toContain("Pesan tiket pulang-pergi.");
    expect(html).toMatch(/<h2[^>]*>Perkiraan biaya<\/h2>/);
    expect(html).toContain("Rp 10.000.000 – Rp 16.000.000");
    expect(html).toContain("per orang");
    expect(html).toContain("Berangkat dari Surabaya");
    expect(html).not.toContain("tergantung kota keberangkatan");
    expect(html).toContain("Harga perkiraan, dapat berubah");
    expect(html).toMatch(/<h2[^>]*>Langkah sebelumnya<\/h2>/);
    expect(html).toContain(`href="/steps/${passportId}?trip=${tripId}"`);
    expect(html).toContain(">Buat atau perpanjang paspor</a>");
    expect(html).toMatch(/bg-success-soft[^"]*">Selesai<\/span>/);
    // Guide starts with its own h2, so no extra hidden heading.
    expect(html).toMatch(/<h2[^>]*>Langkah-langkah<\/h2>/);
    expect(html).not.toContain('class="sr-only">Panduan lengkap');
    expect(html).toContain('href="https://www.nusuk.sa" target="_blank"');
    expect(html).not.toContain("<header");
    expect(html).not.toContain('role="radiogroup"');
    // The report button sits between the guide and the tips; the tips
    // form has the page's only indigo CTA.
    const report = html.indexOf(">Laporkan info usang</button>");
    expect(report).toBeGreaterThan(html.indexOf("Langkah-langkah"));
    expect(html.indexOf("Tips dari jemaah")).toBeGreaterThan(report);
    expect(html.match(/bg-primary(?![\w-])/g)).toHaveLength(1);
  });

  it("without a trip, links to onboarding, notes the city and shows no status", async () => {
    locale = "id";
    const html = await render({
      cost: {
        key: "range",
        values: { min: "Rp 9.000.000", max: "Rp 18.000.000" },
      },
      prerequisites: [{ ...passport, status: null }],
    });
    expect(html).toMatch(/<a [^>]*href="\/onboarding"[^>]*>.*?Kembali ke checklist<\/a>/);
    expect(html).toContain("Rp 9.000.000 – Rp 18.000.000");
    expect(html).toContain(
      "Biaya bisa berbeda tergantung kota keberangkatan Anda.",
    );
    expect(html).not.toContain("Berangkat dari");
    expect(html).toContain(`href="/steps/${passportId}"`);
    expect(html).not.toContain("?trip=");
    expect(html).not.toContain("Selesai");
    expect(html).not.toContain("Belum mulai");
  });

  it("hides the prerequisites card and city note when not applicable", async () => {
    locale = "id";
    const html = await render({
      step: { ...step, cost_varies_by_city: false },
      cost: { key: "none", values: {} },
    });
    expect(html).not.toContain("Langkah sebelumnya");
    expect(html).not.toContain("tergantung kota");
    expect(html).toContain("Belum ada perkiraan biaya");
    expect(html).not.toContain("per orang");
  });

  it("renders English copy and content with the en locale", async () => {
    locale = "en";
    const html = await render({
      trip,
      prerequisites: [{ ...passport, status: "in_progress" }],
    });
    expect(html).toContain("Back to checklist");
    expect(html).toMatch(/<h1[^>]*>Book flights \(Jeddah or Madinah\)<\/h1>/);
    expect(html).toContain("Book a return ticket.");
    expect(html).toContain("Estimated cost");
    expect(html).toContain("per person");
    expect(html).toContain("Do these first");
    expect(html).toContain(">Apply for or renew your passport</a>");
    expect(html).toMatch(/bg-warning-soft[^"]*">In progress<\/span>/);
    expect(html).toMatch(/<h2[^>]*>Steps<\/h2>/);
    expect(html).toContain("(opens in a new tab)");
    expect(html).toContain(">Report outdated info</button>");
    expect(html).not.toContain("Langkah");
  });

  it("shows a fallback and a hidden guide heading without guide content", async () => {
    locale = "en";
    const empty = await render({ step: { ...step, detail_content_en: "" } });
    expect(empty).toContain("The full guide is not available yet.");
    expect(empty).toContain('<h2 class="sr-only">Full guide</h2>');

    const noHeading = await render({
      step: { ...step, detail_content_en: "Just a paragraph." },
    });
    expect(noHeading).toContain('<h2 class="sr-only">Full guide</h2>');
    expect(noHeading).toContain("<p>Just a paragraph.</p>");
  });
});
