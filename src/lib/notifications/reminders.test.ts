import { describe, expect, it } from "vitest";
import { dueReminderPhases, jakartaToday } from "./reminders";

// 2026-10-19 in Jakarta (UTC+7) for the whole of this instant's day.
const now = new Date("2026-10-19T05:00:00Z");

function inDays(days: number) {
  const date = new Date(Date.UTC(2026, 9, 19 + days));
  return date.toISOString().slice(0, 10);
}

describe("dueReminderPhases", () => {
  it.each([
    [181, []],
    [180, ["3_6_months_before"]],
    [91, ["3_6_months_before"]],
    [90, ["3_6_months_before", "2_3_months_before"]],
    [31, ["3_6_months_before", "2_3_months_before"]],
    [30, ["3_6_months_before", "2_3_months_before", "1_month_before"]],
    [8, ["3_6_months_before", "2_3_months_before", "1_month_before"]],
    [
      7,
      [
        "3_6_months_before",
        "2_3_months_before",
        "1_month_before",
        "1_week_before",
      ],
    ],
    [
      2,
      [
        "3_6_months_before",
        "2_3_months_before",
        "1_month_before",
        "1_week_before",
      ],
    ],
    [
      1,
      [
        "3_6_months_before",
        "2_3_months_before",
        "1_month_before",
        "1_week_before",
        "departure_day",
      ],
    ],
    [
      0,
      [
        "3_6_months_before",
        "2_3_months_before",
        "1_month_before",
        "1_week_before",
        "departure_day",
      ],
    ],
  ])("departure in %i days → %j", (days, phases) => {
    expect(dueReminderPhases(inDays(days), now)).toEqual(phases);
  });

  it("returns nothing without a departure date", () => {
    expect(dueReminderPhases(null, now)).toEqual([]);
  });

  it("returns nothing once departure is past", () => {
    expect(dueReminderPhases(inDays(-1), now)).toEqual([]);
  });

  it("counts days from today's date in Asia/Jakarta", () => {
    // 18:00 UTC on Oct 19 is already Oct 20 in Jakarta: 90 days left, not 91.
    const lateUtc = new Date("2026-10-19T18:00:00Z");
    expect(jakartaToday(lateUtc)).toBe("2026-10-20");
    expect(dueReminderPhases(inDays(91), lateUtc)).toEqual([
      "3_6_months_before",
      "2_3_months_before",
    ]);
    expect(dueReminderPhases(inDays(91), now)).toEqual(["3_6_months_before"]);
  });

  it("crosses a month boundary with a 1st-of-month departure", () => {
    expect(dueReminderPhases("2026-11-01", now)).toEqual([
      "3_6_months_before",
      "2_3_months_before",
      "1_month_before",
    ]);
  });
});
