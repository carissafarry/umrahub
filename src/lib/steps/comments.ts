// Step comment (tip) rules, shared by the client form and the Server Action.
// The database check constraint enforces the same bounds.

export const maxCommentLength = 1000;

// What the step detail page shows per comment; the author's user id and
// other users' votes stay on the server. `viewerVote` is null when the
// viewer hasn't rated the tip.
export type StepComment = {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
  isOwn: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  viewerVote: 1 | -1 | null;
};

// A fixed code only: errors never carry the submitted text.
export type CommentContentResult =
  | { ok: true; content: string }
  | { ok: false; error: "empty" | "tooLong" };

// Trimmed, 1–1000 characters.
export function parseCommentContent(raw: unknown): CommentContentResult {
  const content = typeof raw === "string" ? raw.trim() : "";
  if (content.length < 1) return { ok: false, error: "empty" };
  if (content.length > maxCommentLength) return { ok: false, error: "tooLong" };
  return { ok: true, content };
}
