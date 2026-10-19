import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { AppBottomNav } from "@/components/AppNav";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import { loadNotifications } from "@/lib/notifications/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Notifications");
  return { title: t("metaTitle") };
}

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

// The signed-in user's notifications, newest first. Marking read uses plain
// forms posting to Server Actions, so it works without client JS.
export default async function NotificationsPage() {
  const notifications = await loadNotifications();
  const t = await getTranslations("Notifications");
  const locale = await getLocale();
  const format = await getFormatter();
  const hasUnread = notifications.some((item) => !item.is_read);

  async function markAllRead() {
    "use server";
    await markAllNotificationsRead();
  }

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-col gap-6 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:gap-8 lg:pt-8 lg:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="text-lg text-muted">{t("intro")}</p>
          </div>
          {hasUnread && (
            <form action={markAllRead} className="lg:shrink-0">
              <Button type="submit">{t("markAllRead")}</Button>
            </form>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="lg:max-w-xl lg:p-7">
            <p className="text-muted">{t("empty")}</p>
          </Card>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {notifications.map((item) => {
              async function markRead() {
                "use server";
                await markNotificationRead(item.id);
              }

              return (
                <Card key={item.id} as="li" className="flex flex-col gap-3 lg:p-7">
                  {!item.is_read && (
                    <p className="self-start rounded-full bg-tile-violet px-3 py-1 text-sm font-semibold text-tile-violet-foreground">
                      {t("unread")}
                    </p>
                  )}
                  <h2 className="text-xl font-semibold">
                    {locale === "en" ? item.title_en : item.title_id}
                  </h2>
                  <p>{locale === "en" ? item.body_en : item.body_id}</p>
                  {item.trip_id && item.trips && (
                    <Link
                      href={`/trips/${item.trip_id}`}
                      className={`tap-target inline-flex items-center self-start font-medium text-primary underline underline-offset-4 ${focusRing}`}
                    >
                      {item.trips.name}
                    </Link>
                  )}
                  <p className="text-sm text-muted">
                    {t("created", {
                      date: format.dateTime(new Date(item.created_at), {
                        dateStyle: "medium",
                        timeZone: "Asia/Jakarta",
                      }),
                    })}
                  </p>
                  {!item.is_read && (
                    <form action={markRead} className="mt-auto">
                      <button
                        type="submit"
                        className={`tap-target rounded-full border border-border bg-surface px-5 font-medium text-foreground shadow-card ${focusRing}`}
                      >
                        {t("markRead")}
                      </button>
                    </form>
                  )}
                </Card>
              );
            })}
          </ul>
        )}
      </main>
      <AppBottomNav activeHref="/notifications" />
    </div>
  );
}
