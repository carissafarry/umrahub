// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCard } from "./ErrorCard";

describe("ErrorCard", () => {
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

  it("renders title, description and a retry button that calls onRetry once", () => {
    const onRetry = vi.fn();
    act(() =>
      root.render(
        <ErrorCard
          title="Gagal memuat"
          description="Coba lagi nanti."
          retryLabel="Coba lagi"
          onRetry={onRetry}
        />,
      ),
    );
    expect(container.querySelector("h1")?.textContent).toBe("Gagal memuat");
    expect(container.textContent).toContain("Coba lagi nanti.");
    const button = container.querySelector("button")!;
    expect(button.textContent).toBe("Coba lagi");
    act(() => button.click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders children instead of a retry button", () => {
    act(() =>
      root.render(
        <ErrorCard title="Hilang" description="Tidak ada.">
          <a href="/dashboard">Kembali</a>
        </ErrorCard>,
      ),
    );
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/dashboard");
  });
});
