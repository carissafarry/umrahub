// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import { localIsoDate } from "@/lib/onboarding/dates";
import { parseOnboardingInput } from "@/lib/onboarding/validate";
import { OnboardingWizard } from "./OnboardingWizard";

const createTripFromOnboarding = vi.hoisted(() => vi.fn());
const createAdditionalTrip = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ createTripFromOnboarding }));
vi.mock("@/app/trips/new/actions", () => ({ createAdditionalTrip }));

const today = localIsoDate(new Date());
const [thisYear, thisMonth] = today.split("-").map(Number);
// The 12th to the 22nd of next month, as in the design preview.
const nextMonth = new Date(Date.UTC(thisYear, thisMonth, 1));
const isoNext = (day: number) =>
  `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

describe("OnboardingWizard date step", () => {
  let container: HTMLDivElement;
  let root: Root;

  function render(
    variant: "onboarding" | "newTrip" = "onboarding",
    locale: "id" | "en" = "id",
  ) {
    act(() =>
      root.render(
        <NextIntlClientProvider
          locale={locale}
          messages={locale === "id" ? id : en}
          timeZone="UTC"
        >
          <OnboardingWizard variant={variant} today={today} />
        </NextIntlClientProvider>,
      ),
    );
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    createTripFromOnboarding.mockReset().mockResolvedValue({ error: "failed" });
    createAdditionalTrip.mockReset().mockResolvedValue({ error: "failed" });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const buttons = () => [...container.querySelectorAll("button")];
  const byText = (text: string) =>
    buttons().find((button) => button.textContent === text)!;
  const byLabel = (label: string) =>
    container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const submit = () =>
    container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const day = (n: number) =>
    buttons().find(
      (button) =>
        button.hasAttribute("aria-pressed") && button.textContent === String(n),
    )!;
  const alert = () => container.querySelector('[role="alert"]')?.textContent;
  const next = async () => act(async () => submit().click());

  function type(selector: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(selector)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      input,
      value,
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function toDateStep() {
    act(() => byText("Jakarta").click());
    await next();
  }

  async function pickPreviewRange() {
    act(() => byLabel("Bulan berikutnya").click());
    act(() => day(12).click());
    act(() => byText("11 hari").click());
  }

  it("shows the title, duration chips, calendar and hint, and no selects", async () => {
    render();
    expect(submit().textContent).toBe("Next");
    await toDateStep();
    expect(container.querySelector("h2")!.textContent).toBe("Kapan kamu berangkat?");
    for (const chip of ["9 hari", "11 hari", "14 hari"]) {
      expect(byText(chip)).toBeTruthy();
    }
    expect(byLabel("Bulan sebelumnya")).toBeTruthy();
    expect(byLabel("Bulan berikutnya")).toBeTruthy();
    expect(container.textContent).toContain(
      "Belum pasti? Pilih perkiraan, bisa diubah nanti.",
    );
    expect(container.querySelector("select")).toBeNull();
    expect(submit().textContent).toBe("Next");
  });

  it("sets the return date from a duration chip and clears the chip on another length", async () => {
    render();
    await toDateStep();
    expect(byText("11 hari").disabled).toBe(true);
    await pickPreviewRange();
    expect(byText("11 hari").getAttribute("aria-pressed")).toBe("true");
    expect(day(22).className).toContain("bg-primary");
    expect(day(23).className).not.toContain("bg-primary");
    // A new range of another length unselects the chip.
    act(() => day(10).click());
    act(() => day(15).click());
    expect(byText("11 hari").getAttribute("aria-pressed")).toBe("false");
    expect(byText("9 hari").getAttribute("aria-pressed")).toBe("false");
  });

  it("blocks Next without a return date or with bad city dates", async () => {
    render();
    await toDateStep();
    await next();
    expect(alert()).toBe("Pilih tanggal berangkat dalam 24 bulan ke depan.");
    act(() => byLabel("Bulan berikutnya").click());
    act(() => day(12).click());
    await next();
    expect(alert()).toBe(
      "Pilih tanggal pulang, sama dengan atau setelah tanggal berangkat.",
    );
    act(() => byText("11 hari").click());
    await next();
    expect(alert()).toBe("Isi tanggal mulai dan selesai untuk Makkah atau Madinah.");

    const legsError =
      "Tanggal kota harus lengkap, di dalam tanggal trip, dan Madinah mulai paling cepat di hari Makkah selesai.";
    // Makkah outside the trip.
    act(() => type("#leg-Makkah-startDate", isoNext(11)));
    act(() => type("#leg-Makkah-endDate", isoNext(16)));
    await next();
    expect(alert()).toBe(legsError);
    // Makkah ending before it starts.
    act(() => type("#leg-Makkah-startDate", isoNext(16)));
    act(() => type("#leg-Makkah-endDate", isoNext(14)));
    await next();
    expect(alert()).toBe(legsError);
    // Madinah starting before Makkah ends.
    act(() => type("#leg-Makkah-startDate", isoNext(12)));
    act(() => type("#leg-Makkah-endDate", isoNext(17)));
    act(() => type("#leg-Madinah-startDate", isoNext(16)));
    act(() => type("#leg-Madinah-endDate", isoNext(22)));
    await next();
    expect(alert()).toBe(legsError);
    expect(container.querySelector("h2")!.textContent).toBe("Kapan kamu berangkat?");

    act(() => type("#leg-Madinah-startDate", isoNext(17)));
    await next();
    expect(container.querySelector("h2")!.textContent).toBe("Status paspor");
  });

  async function completeWizard() {
    await toDateStep();
    await pickPreviewRange();
    act(() => type("#leg-Makkah-startDate", isoNext(12)));
    act(() => type("#leg-Makkah-endDate", isoNext(17)));
    act(() => type("#leg-Madinah-startDate", isoNext(17)));
    act(() => type("#leg-Madinah-endDate", isoNext(22)));
    await next();
    act(() => byText("Punya, masih berlaku").click());
    await next();
    act(() => type("#traveler-0", "Budi"));
    await next();
    expect(submit().textContent).toBe("Buat perjalanan saya");
    await next();
  }

  const expectedPayload = () => ({
    city: "Jakarta",
    departureDate: isoNext(12),
    returnDate: isoNext(22),
    legs: [
      { city: "Makkah", startDate: isoNext(12), endDate: isoNext(17) },
      { city: "Madinah", startDate: isoNext(17), endDate: isoNext(22) },
    ],
    passport: "valid",
    travelers: [{ name: "Budi", isMinor: false, hasDisability: false }],
    disabilityNotes: null,
  });

  it("submits the dated payload that parseOnboardingInput accepts", async () => {
    render();
    await completeWizard();
    expect(createTripFromOnboarding).toHaveBeenCalledTimes(1);
    const payload = createTripFromOnboarding.mock.calls[0][0];
    expect(payload).toEqual(expectedPayload());
    const parsed = parseOnboardingInput(payload);
    expect(parsed.ok).toBe(true);
    expect(alert()).toBe("Perjalanan gagal dibuat. Silakan coba lagi.");
  });

  it("submits the same payload through createAdditionalTrip on /trips/new", async () => {
    render("newTrip");
    await completeWizard();
    expect(createTripFromOnboarding).not.toHaveBeenCalled();
    expect(createAdditionalTrip.mock.calls[0][0]).toEqual(expectedPayload());
  });

  it("labels the forward button Next in English too", async () => {
    render("onboarding", "en");
    expect(submit().textContent).toBe("Next");
    act(() => byText("Jakarta").click());
    await next();
    expect(container.querySelector("h2")!.textContent).toBe("When are you leaving?");
    expect(byText("11 days")).toBeTruthy();
  });
});
