// Content flag ("report outdated info") rules, shared by the client form and
// the Server Action. The database check constraint enforces the same bounds.

export const maxFlagReasonLength = 500;

// A fixed code only: errors never carry the submitted text.
export type FlagReasonResult =
  | { ok: true; reason: string }
  | { ok: false; error: "empty" | "tooLong" };

// Trimmed, 1–500 characters.
export function parseFlagReason(raw: unknown): FlagReasonResult {
  const reason = typeof raw === "string" ? raw.trim() : "";
  if (reason.length < 1) return { ok: false, error: "empty" };
  if (reason.length > maxFlagReasonLength) return { ok: false, error: "tooLong" };
  return { ok: true, reason };
}
