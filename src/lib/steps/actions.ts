"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/trips/checklist";
import { parseCommentContent } from "./comments";
import { parseFlagReason } from "./flags";

export type PostCommentResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "empty" | "tooLong" | "failed" };

export type DeleteCommentResult = { ok: true } | { ok: false };

export type ReportContentResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "empty" | "tooLong" | "failed" };

// Logs a fixed message plus the Postgres error code only.
function logFailure(stage: string, error: { code?: string } | null) {
  console.error(`Step comments: ${stage} failed`, error?.code ?? "unknown");
}

// Posts a tip as the signed-in user. Only the step and the text are sent:
// the database fills the author, and RLS and the column grant are the
// second line of defence.
export async function postStepComment(
  stepId: string,
  content: string,
): Promise<PostCommentResult> {
  if (!isUuid(stepId)) return { ok: false, error: "invalid" };
  const parsed = parseCommentContent(content);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "failed" };

  const { error } = await supabase
    .from("step_comments")
    .insert({ step_id: stepId, content: parsed.content });
  if (error) {
    logFailure("comment insert", error);
    return { ok: false, error: "failed" };
  }

  revalidatePath(`/steps/${stepId}`);
  return { ok: true };
}

export async function deleteStepComment(
  commentId: string,
  stepId: string,
): Promise<DeleteCommentResult> {
  if (!isUuid(commentId) || !isUuid(stepId)) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("step_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);
  if (error) {
    logFailure("comment delete", error);
    return { ok: false };
  }

  revalidatePath(`/steps/${stepId}`);
  return { ok: true };
}

// Reports outdated information on a step as the signed-in user. Only the
// step and the reason are sent: the database fills the user and the
// pending status. Nothing on the page shows flags, so nothing is revalidated.
export async function reportStepContent(
  stepId: string,
  reason: string,
): Promise<ReportContentResult> {
  if (!isUuid(stepId)) return { ok: false, error: "invalid" };
  const parsed = parseFlagReason(reason);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "failed" };

  const { error } = await supabase
    .from("content_flags")
    .insert({ step_id: stepId, reason: parsed.reason });
  if (error) {
    logFailure("content flag insert", error);
    return { ok: false, error: "failed" };
  }

  return { ok: true };
}
