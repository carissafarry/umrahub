// Trip dashboard rules, shared by the client dialogs and the Server Actions.

export const maxTripNameLength = 80;

// App-level cap, checked only when creating an additional trip.
export const maxTripsPerUser = 10;

// A fixed code only: errors never carry the submitted value.
export type TripNameResult =
  | { ok: true; value: string }
  | { ok: false; error: "invalid_name" };

// Trimmed, 1–80 characters; duplicates are allowed.
export function parseTripName(raw: unknown): TripNameResult {
  if (typeof raw !== "string") return { ok: false, error: "invalid_name" };
  const value = raw.trim();
  if (value.length < 1 || value.length > maxTripNameLength) {
    return { ok: false, error: "invalid_name" };
  }
  return { ok: true, value };
}
