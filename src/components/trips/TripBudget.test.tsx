import { createTranslator, NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import type { BudgetStep } from "@/lib/trips/budget";
import { formatRupiah } from "@/lib/trips/checklist";
import { TripBudget } from "./TripBudget";

let locale: "id" | "en" = "id";
const messages = () => (locale === "id" ? id : en);

vi.mock("next-intl/server", () => ({
  getLocale: async () => locale,
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale,
      messages: messages(),
      namespace: namespace as "Budget",
    }),
}));

const tripId = "11111111-1111-4111-8111-111111111111";
const trip = { id: tripId, name: "Umrah keluarga", departure_city: "Surabaya" };

const step = (
  n: number,
  phase_key: string,
  min: number | null,
  max: number | null,
  is_shared_step: boolean,
  title_id: string,
  title_en: string,
): BudgetStep => ({
  id: `5eed0000-0000-4000-8000-0000000000${n}`,
  phase_key,
  category_key: "booking",
  title_id,
  title_en,
  summary_id: null,
  summary_en: null,
  estimated_cost_min: min,
  estimated_cost_max: max,
  sort_order: n * 10,
  is_shared_step,
});

const steps = [
  step(7, "2_3_months_before", 1000000, 2000000, true, "Ajukan visa Umrah", "Apply for the Umrah visa"),
  step(9, "2_3_months_before", 1000000, 2000000, false, "Pesan tiket pesawat", "Book flights"),
  step(20, "departure_day", null, null, true, "Cek dokumen", "Check documents"),
];

const travelers = [{ id: "a" }, { id: "b" }, { id: "c" }];

async function render(props: Partial<Parameters<typeof TripBudget>[0]> = {}) {
  const element = await TripBudget({
    trip,
    steps,
    overrides: [],
    configs: [],
    travelers,
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

describe("TripBudget", () => {
  it("renders totals, multipliers, the chart and the disclaimer in id", async () => {
    locale = "id";
    const html = await render();
    expect(html).toMatch(
      new RegExp(`<a [^>]*href="/trips/${tripId}"[^>]*>.*?Kembali ke checklist</a>`),
    );
    expect(html).toMatch(/<h1[^>]*>Anggaran Umrah keluarga<\/h1>/);
    expect(html).toContain("Untuk 3 orang");
    // Overall: visa 1–2 jt (shared) + flights 3–6 jt (3 travelers).
    expect(html).toContain(
      `${formatRupiah(4000000)} – ${formatRupiah(8000000)}`,
    );
    // formatRupiah gives "Rp 3.000.000" with a non-breaking space.
    expect(html).toContain(`${formatRupiah(3000000)} – ${formatRupiah(6000000)}`);
    expect(html).toContain(
      `${formatRupiah(1000000)} – ${formatRupiah(2000000)} per orang × 3 orang`,
    );
    expect(html).toContain("Dibagi untuk seluruh rombongan");
    expect(html).toContain("Belum ada perkiraan biaya");
    expect(html).toContain("2–3 bulan sebelum berangkat");
    expect(html).toContain("Hari keberangkatan");
    expect(html).toContain("Harga perkiraan, dapat berubah");
    // One aria-hidden bar per phase: the larger phase fills the track.
    expect(html.match(/aria-hidden="true" class="flex h-3/g)).toHaveLength(2);
    expect(html).toContain('class="h-full bg-primary" style="width:50%"');
    expect(html).toContain('class="h-full bg-primary/40" style="width:50%"');
    expect(html).not.toContain("<header");
    expect(html).not.toContain("NaN");
  });

  it("renders English copy with the en locale", async () => {
    locale = "en";
    const html = await render();
    expect(html).toContain("Back to checklist");
    expect(html).toMatch(/<h1[^>]*>Budget for Umrah keluarga<\/h1>/);
    expect(html).toContain("For 3 people");
    expect(html).toContain("Book flights");
    expect(html).toContain("per person × 3 people");
    expect(html).toContain("Shared by the whole group");
    expect(html).toContain("Estimated prices, subject to change");
    expect(html).not.toContain("Harga perkiraan");
  });

  it("applies config rows and never divides by zero", async () => {
    locale = "id";
    const configured = await render({
      configs: [{ step_id: steps[0].id, tracking_mode: "individual" }],
    });
    expect(configured).toContain(
      `${formatRupiah(6000000)} – ${formatRupiah(12000000)}`,
    );

    const empty = await render({ steps: [steps[2]] });
    expect(empty).toContain('style="width:0%"');
    expect(empty).not.toContain("NaN");
    expect(empty).not.toContain("Infinity");
  });
});
