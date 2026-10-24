// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import { ReportOutdatedInfo } from "./ReportOutdatedInfo";

const reportStepContent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/steps/actions", () => ({ reportStepContent }));

const stepId = "5eed0000-0000-4000-8000-000000000001";

function tree(locale: "id" | "en" = "id") {
  return (
    <NextIntlClientProvider locale={locale} messages={locale === "id" ? id : en}>
      <ReportOutdatedInfo stepId={stepId} />
    </NextIntlClientProvider>
  );
}

describe("ReportOutdatedInfo markup", () => {
  it("renders a neutral trigger, a labelled dialog and live regions", () => {
    const html = renderToStaticMarkup(tree());
    expect(html).toMatch(
      /<button type="button" class="tap-target[^"]*border border-border bg-surface[^"]*">Laporkan info usang<\/button>/,
    );
    expect(html).not.toMatch(/bg-primary(?![\w-])/);
    const title = html.match(/<dialog aria-labelledby="([^"]+)"/)?.[1];
    expect(html).toMatch(new RegExp(`<h2 id="${title}"[^>]*>Laporkan info usang</h2>`));
    expect(html).toContain("Tim Umra Hub akan meninjaunya.");
    const label = html.match(/<label for="([^"]+)"[^>]*>Apa yang perlu diperbarui\?<\/label>/)?.[1];
    expect(html).toMatch(new RegExp(`<textarea[^>]*id="${label}"[^>]*maxLength="500"`));
    expect(html).toContain("0/500 karakter");
    expect(html.match(/aria-live="polite"/g)).toHaveLength(2);
    // Submit is ink-filled, never indigo.
    expect(html).toMatch(/<button type="submit" class="[^"]*bg-foreground text-background[^"]*">Kirim laporan<\/button>/);
    expect(html).toContain(">Batal</button>");
  });

  it("renders English copy with the en locale", () => {
    const html = renderToStaticMarkup(tree("en"));
    expect(html).toContain(">Report outdated info</button>");
    expect(html).toContain("What needs updating?");
    expect(html).toContain("0/500 characters");
    expect(html).toContain(">Send report</button>");
    expect(html).toContain(">Cancel</button>");
  });
});

describe("ReportOutdatedInfo interaction", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    // jsdom has no modal dialog support: model only the open state.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
    reportStepContent.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(tree()));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const trigger = () =>
    [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Laporkan info usang",
    )!;
  const dialog = () => container.querySelector("dialog")!;
  const textarea = () => container.querySelector("textarea")!;
  const submit = () =>
    container.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  function type(value: string) {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;
    setValue.call(textarea(), value);
    textarea().dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("shows the empty-reason error without calling the action", async () => {
    act(() => trigger().click());
    expect(dialog().open).toBe(true);
    type("   ");
    await act(async () => submit().click());
    expect(reportStepContent).not.toHaveBeenCalled();
    expect(dialog().open).toBe(true);
    expect(container.textContent).toContain(
      "Tulis alasan laporan Anda terlebih dahulu.",
    );
    expect(textarea().getAttribute("aria-invalid")).toBe("true");
  });

  it("sends the trimmed reason, closes and shows the confirmation", async () => {
    reportStepContent.mockResolvedValue({ ok: true });
    act(() => trigger().click());
    type("  Biaya visa sudah naik  ");
    await act(async () => submit().click());
    expect(reportStepContent).toHaveBeenCalledWith(stepId, "Biaya visa sudah naik");
    expect(dialog().open).toBe(false);
    expect(textarea().value).toBe("");
    expect(container.textContent).toContain(
      "Terima kasih, laporan Anda sudah kami terima.",
    );
    expect(document.activeElement).toBe(trigger());
  });

  it("keeps the dialog open with a generic error when sending fails", async () => {
    reportStepContent.mockResolvedValue({ ok: false, error: "invalid" });
    act(() => trigger().click());
    type("Biaya visa sudah naik");
    await act(async () => submit().click());
    expect(dialog().open).toBe(true);
    expect(container.textContent).toContain(
      "Laporan belum terkirim. Coba lagi sebentar lagi.",
    );
    expect(container.textContent).not.toContain("Terima kasih");
  });

  it("closes on Cancel without sending and returns focus", () => {
    act(() => trigger().click());
    type("Draf");
    const cancel = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Batal",
    )!;
    act(() => cancel.click());
    expect(dialog().open).toBe(false);
    expect(reportStepContent).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger());
  });
});
