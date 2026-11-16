// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import messages from "../../messages/id.json";
import NotFound from "./not-found";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) =>
    (messages.NotFound as Record<string, string>)[key],
}));

describe("not-found page", () => {
  it("shows the copy, a primary and a secondary link, and a decorative 404", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const element = await NotFound();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(element));

    expect(container.querySelector("h1")?.textContent).toBe("Halaman ini tidak ditemukan.");
    const links = [...container.querySelectorAll("a")];
    expect(links.map((a) => [a.getAttribute("href"), a.textContent])).toEqual([
      ["/dashboard", "Kembali ke Beranda"],
      ["/trips", "Lihat trip saya"],
    ]);
    const numeral = [...container.querySelectorAll("[aria-hidden='true']")].find(
      (el) => el.textContent === "404",
    );
    expect(numeral).toBeTruthy();
    act(() => root.unmount());
    container.remove();
  });
});
