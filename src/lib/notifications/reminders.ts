// Deadline reminders: each timeline phase's reminder is due once the days
// until departure drop to its threshold (the phase's window opening;
// `departure_day` fires the day before so it is still actionable).
export const reminderThresholds = {
  "3_6_months_before": 180,
  "2_3_months_before": 90,
  "1_month_before": 30,
  "1_week_before": 7,
  departure_day: 1,
} as const;

export type ReminderPhase = keyof typeof reminderThresholds;

const reminderPhases = Object.keys(reminderThresholds) as ReminderPhase[];

const dayMs = 24 * 60 * 60 * 1000;

// Today's calendar date in Asia/Jakarta as `YYYY-MM-DD`.
export function jakartaToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function utcDay(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

// The phases whose reminder is due for a trip departing on
// `plannedDepartureDate` (`YYYY-MM-DD`), as of `now`. None without a date or
// once departure is past.
export function dueReminderPhases(
  plannedDepartureDate: string | null,
  now: Date,
): ReminderPhase[] {
  if (!plannedDepartureDate) return [];
  const days = Math.round(
    (utcDay(plannedDepartureDate) - utcDay(jakartaToday(now))) / dayMs,
  );
  if (days < 0) return [];
  return reminderPhases.filter((phase) => days <= reminderThresholds[phase]);
}
