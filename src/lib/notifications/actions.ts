"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/trips/checklist";

export type MarkReadResult = { ok: true } | { ok: false };

// Revalidates every page: the header badge is on all of them.
function revalidateNotifications() {
  revalidatePath("/", "layout");
}

// Marks one of the signed-in user's notifications read. The owner filter is
// re-checked here; RLS and the column grant are the second line of defence.
export async function markNotificationRead(
  id: string,
): Promise<MarkReadResult> {
  if (!isUuid(id)) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false };

  revalidateNotifications();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<MarkReadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) return { ok: false };

  revalidateNotifications();
  return { ok: true };
}
