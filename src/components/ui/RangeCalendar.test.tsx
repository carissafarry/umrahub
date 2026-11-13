// @vitest-environment jsdom
import { NextIntlClientProvider } from "next-intl";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextRange, RangeCalendar, type DateRange } from "./RangeCalendar";

function Harness({ initial }: { initial: DateRange }) {
  const [value, setValue] = useState(initial);
  return (
    <NextIntlClientProvider locale="id" messages={{}}>
      <RangeCalendar
        value={value}
        min="2027-01-05"
        max="2027-02-20"
        today="2027-01-05"
        onChange={setValue}
        label="Tanggal berangkat dan pulang"
        previousMonthLabel="Bulan sebelumnya"
        nextMonthLabel="Bulan berikutnya"
      />
    </NextIntlClientProvider>
  );
}

describe("nextRange", () => {
  it("sets the start, then the end, and restarts on an earlier day", () => {
    const empty = { start: null, end: null };
    expect(nextRange(empty, "2027-01-12")).toEqual({ start: "2027-01-12", end: null });
    expect(nextRange({ start: "2027-01-12", end: null }, "2027-01-22")).toEqual({
      start: "2027-01-12",
      end: "2027-01-22",
    });
    expect(nextRange({ start: "2027-01-12", end: null }, "2027-01-08")).toEqual({
      start: "2027-01-08",
      end: null,
    });
    expect(
      nextRange({ start: "2027-01-12", end: "2027-01-22" }, "2027-01-08"),
    ).toEqual({ start: "2027-01-08", end: null });
  });
});

describe("RangeCalendar", () => {
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

  const render = (initial: DateRange = { start: null, end: null }) =>
    act(() => root.render(<Harness initial={initial} />));
  const day = (n: number) =>
    [...container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].find(
      (button) => button.textContent === String(n),
    )!;
  const tap = (n: number) => act(() => day(n).click());
  const button = (label: string) =>
    container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it("shows the month, weekday headers from the locale and full-date names", () => {
    render();
    expect(container.textContent).toContain("Januari 2027");
    expect(container.textContent).toContain("Min");
    expect(container.textContent).toContain("Sen");
    expect(day(12).getAttribute("aria-label")).toBe("Selasa, 12 Januari 2027");
    expect(day(5).getAttribute("aria-current")).toBe("date");
    expect(container.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe(
      "Tanggal berangkat dan pulang",
    );
  });

  it("draws the start and end as ink circles with the days between filled", () => {
    render();
    tap(12);
    expect(day(12).className).toContain("bg-primary text-primary-foreground");
    expect(day(12).getAttribute("aria-pressed")).toBe("true");
    expect(day(13).getAttribute("aria-pressed")).toBe("false");
    tap(22);
    expect(day(22).className).toContain("bg-primary text-primary-foreground");
    expect(day(17).getAttribute("aria-pressed")).toBe("true");
    expect(day(17).className).not.toContain("bg-primary");
    const band = (n: number) =>
      day(n).parentElement!.querySelector("span[aria-hidden]")?.className ?? "";
    expect(band(17)).toContain("bg-surface inset-x-0");
    expect(band(12)).toContain("bg-surface left-1/2 right-0");
    expect(band(22)).toContain("bg-surface left-0 right-1/2");
    expect(band(23)).toBe("");
    expect(day(23).getAttribute("aria-pressed")).toBe("false");
  });

  it("restarts the range at an earlier day", () => {
    render({ start: "2027-01-12", end: "2027-01-22" });
    tap(8);
    expect(day(8).className).toContain("bg-primary");
    expect(day(12).className).not.toContain("bg-primary");
    expect(day(22).className).not.toContain("bg-primary");
    expect(day(10).getAttribute("aria-pressed")).toBe("false");
  });

  it("disables days before min and after max, and the month buttons at the bounds", () => {
    render();
    expect(day(4).disabled).toBe(true);
    expect(day(5).disabled).toBe(false);
    expect(button("Bulan sebelumnya").disabled).toBe(true);
    act(() => button("Bulan berikutnya").click());
    expect(container.textContent).toContain("Februari 2027");
    expect(day(20).disabled).toBe(false);
    expect(day(21).disabled).toBe(true);
    expect(button("Bulan berikutnya").disabled).toBe(true);
    expect(button("Bulan sebelumnya").disabled).toBe(false);
  });
});
