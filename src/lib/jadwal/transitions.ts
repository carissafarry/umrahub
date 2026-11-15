export const participationStatuses = [
  "interested",
  "fix",
  "awaiting_payment",
  "paid_claimed",
  "confirmed",
  "declined",
  "lapsed",
  "cancelled",
] as const;

export type ParticipationStatus = (typeof participationStatuses)[number];

export type ParticipationAction =
  | "expressInterest"
  | "setSeats"
  | "confirmAttendance"
  | "respondToOption"
  | "cancelInterest";

export type OptionResponse = "accept" | "decline";

export const minSeats = 1;
export const maxSeats = 10;

export function parseSeats(
  value: unknown,
): { ok: true; seats: number } | { ok: false } {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minSeats ||
    value > maxSeats
  ) {
    return { ok: false };
  }
  return { ok: true, seats: value };
}

type Table = Partial<Record<ParticipationStatus, ParticipationStatus>>;

// Which status each user action may start from, and the status it leaves.
// Users never reach awaiting_payment, confirmed or lapsed: those are set in
// Supabase Studio. A status missing from a row means the action is refused.
const transitions: Record<
  Exclude<ParticipationAction, "respondToOption">,
  Table
> & { respondToOption: Record<OptionResponse, Table> } = {
  expressInterest: { cancelled: "interested" },
  setSeats: { interested: "interested", fix: "fix" },
  confirmAttendance: { interested: "fix" },
  respondToOption: {
    accept: { fix: "fix" },
    decline: { fix: "declined" },
  },
  cancelInterest: {
    interested: "cancelled",
    fix: "cancelled",
    awaiting_payment: "cancelled",
  },
};

// The status after the action, or null when it is refused. `from` is null when
// the trip has no participation row yet (only expressInterest may start there).
export function nextStatus(
  action: ParticipationAction,
  from: ParticipationStatus | null,
  input?: OptionResponse,
): ParticipationStatus | null {
  if (from === null) return action === "expressInterest" ? "interested" : null;
  if (action === "respondToOption") {
    if (input !== "accept" && input !== "decline") return null;
    return transitions.respondToOption[input][from] ?? null;
  }
  return transitions[action][from] ?? null;
}
