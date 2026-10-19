import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { dueReminderPhases } from "./reminders";

export type NotificationItem = {
  id: string;
  trip_id: string | null;
  title_id: string;
  title_en: string;
  body_id: string;
  body_en: string;
  is_read: boolean;
  created_at: string;
  trips: { name: string } | null;
};

type ReminderTrip = { id: string; planned_departure_date: string | null };

// Inserts the due deadline reminders of the signed-in user's trips under
// their RLS. The unique (trip_id, type, phase_key) constraint plus
// `ignoreDuplicates` makes repeated runs a no-op. Runs at most once per
// request; any failure is swallowed so the header and page still render.
export const generateReminders = cache(async (): Promise<void> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: trips, error } = await supabase
      .from("trips")
      .select("id, planned_departure_date")
      .eq("user_id", user.id)
      .not("planned_departure_date", "is", null)
      .overrideTypes<ReminderTrip[], { merge: false }>();
    if (error || !trips) return;

    const now = new Date();
    const due = trips.flatMap((trip) =>
      dueReminderPhases(trip.planned_departure_date, now).map((phase) => ({
        trip,
        phase,
      })),
    );
    if (due.length === 0) return;

    const [tId, tEn] = await Promise.all([
      getTranslations({ locale: "id", namespace: "Notifications.reminders" }),
      getTranslations({ locale: "en", namespace: "Notifications.reminders" }),
    ]);
    const rows = due.map(({ trip, phase }) => ({
      user_id: user.id,
      trip_id: trip.id,
      type: "deadline_reminder",
      phase_key: phase,
      title_id: tId(`${phase}.title`),
      title_en: tEn(`${phase}.title`),
      body_id: tId(`${phase}.body`),
      body_en: tEn(`${phase}.body`),
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .upsert(rows, {
        onConflict: "trip_id,type,phase_key",
        ignoreDuplicates: true,
      });
    if (insertError) {
      console.error("Notifications: generation failed", insertError.code);
    }
  } catch {
    console.error("Notifications: generation failed");
  }
});

// The signed-in user's unread count for the header bell, or null when the
// query fails (the bell then shows no badge).
export async function countUnreadNotifications(
  userId: string,
): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

// Loads /notifications under the user's RLS, newest first, after generating
// any due reminders. Signed out → redirect to `/`.
export async function loadNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  await generateReminders();

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, trip_id, title_id, title_en, body_id, body_en, is_read, created_at, trips(name)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .overrideTypes<NotificationItem[], { merge: false }>();
  if (error) throw new Error("Failed to load notifications");
  return data ?? [];
}
