// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import id from "../../messages/id.json";
import { AccountSheet } from "./AccountSheet";

const signOut = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/actions", () => ({ signOut }));
vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("AccountSheet", () => {
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
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <NextIntlClientProvider locale="id" messages={id}>
          <AccountSheet profile={{ name: "Siti Aminah", avatarUrl: null }} />
        </NextIntlClientProvider>,
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const opener = () =>
    container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
  const dialog = () => container.querySelector("dialog")!;
  const closeButton = () =>
    container.querySelector<HTMLButtonElement>('dialog button[aria-label="Tutup"]')!;

  it("renders a labelled round profile button with the initial", () => {
    expect(opener().getAttribute("aria-label")).toBe("Akun");
    expect(opener().className).toContain("tap-target");
    expect(opener().textContent).toBe("S");
    expect(dialog().open).toBe(false);
  });

  it("opens with name, language switch and a sign-out form, focusing close", () => {
    act(() => opener().click());
    expect(dialog().open).toBe(true);
    expect(document.activeElement).toBe(closeButton());
    const title = dialog().getAttribute("aria-labelledby")!;
    expect(document.getElementById(title)?.textContent).toBe("Akun kamu");
    expect(dialog().textContent).toContain("Siti Aminah");
    expect(dialog().textContent).toContain("Ganti bahasa");
    const radios = [...dialog().querySelectorAll('[role="radio"]')];
    expect(radios.map((radio) => radio.textContent)).toEqual(["ID", "EN"]);
    const submit = dialog().querySelector('form button[type="submit"]')!;
    expect(submit.textContent).toBe("Keluar");
    expect(submit.className).not.toMatch(/bg-primary(?![\w-])/);
  });

  it("closes with the close button and returns focus to the profile button", () => {
    act(() => opener().click());
    act(() => closeButton().click());
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(opener());
  });

  it("closes on Escape and on a backdrop click", () => {
    act(() => opener().click());
    // A browser turns Escape into `cancel` then `close` on a modal dialog.
    act(() => {
      dialog().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      dialog().close();
    });
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(opener());

    act(() => opener().click());
    act(() => dialog().click());
    expect(dialog().open).toBe(false);
  });

  it("keeps the sheet open on a click inside it", () => {
    act(() => opener().click());
    act(() => dialog().querySelector("h2")!.click());
    expect(dialog().open).toBe(true);
  });
});
