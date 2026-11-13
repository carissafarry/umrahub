import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { AppBottomNav } from "@/components/AppNav";
import { HeroArt } from "@/components/HeroArt";
import { Card } from "@/components/ui/Card";
import { BellIcon, CheckIcon, ClockIcon } from "@/components/ui/icons";
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

// The page has no primary CTA, so both mark-read actions are white outline pills.
const outlinePill = `tap-target inline-flex items-center justify-center rounded-full border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground ${focusRing}`;

// The signed-in user's notifications, newest first. Marking read uses plain
// forms posting to Server Actions, so it works without client JS.
export default async function NotificationsPage() {
  const notifications = await loadNotifications();
  const t = await getTranslations("Notifications");
  const locale = await getLocale();
  const format = await getFormatter();
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  async function markAllRead() {
    "use server";
    await markAllNotificationsRead();
  }

  return (
    <div className="mx-auto w-full max-w-md flex-1 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-16">
        <div className="relative h-50 overflow-hidden bg-linear-to-b from-sky-day-from to-sky-day-to px-5 pt-5 md:rounded-t-[2rem] md:px-8 lg:h-64 lg:px-10 lg:pt-10">
          <h1 className="relative z-10 text-[2rem] leading-[1.05] font-semibold tracking-tight break-words text-primary-foreground lg:text-5xl">
            {t("title")}
          </h1>
          <HeroArt />
        </div>

        <div className="relative -mt-7 flex flex-col gap-5 rounded-t-[2rem] bg-background px-4 pt-5 md:px-6 lg:gap-6 lg:px-8 lg:pt-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-muted">{t("intro")}</p>
              {unreadCount > 0 && (
                <p className="text-sm font-bold">
                  {t("unreadCount", { count: unreadCount })}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <form action={markAllRead} className="md:shrink-0">
                <button type="submit" className={outlinePill}>
                  {t("markAllRead")}
                </button>
              </form>
            )}
          </div>

          {notifications.length === 0 ? (
            <Card className="mx-auto flex w-full flex-col items-center gap-3 text-center lg:max-w-xl lg:p-7">
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent"
              >
                <BellIcon className="size-5" />
              </span>
              <p className="text-muted">{t("empty")}</p>
            </Card>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2 lg:items-start">
              {notifications.map((item) => {
                async function markRead() {
                  "use server";
                  await markNotificationRead(item.id);
                }

                return (
                  <li
                    key={item.id}
                    className={`flex items-start gap-3 rounded-[1.375rem] border p-4 ${
                      item.is_read
                        ? "border-border bg-surface-raised"
                        : "border-surface-line bg-surface"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                        item.is_read
                          ? "bg-accent-soft text-accent"
                          : "bg-dusk-tile text-dusk-ink"
                      }`}
                    >
                      {item.is_read ? (
                        <CheckIcon className="size-5" />
                      ) : (
                        <ClockIcon className="size-5" />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {!item.is_read && (
                        <p className="self-start rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">
                          {t("unread")}
                        </p>
                      )}
                      <h2 className="text-sm font-bold break-words">
                        {locale === "en" ? item.title_en : item.title_id}
                      </h2>
                      <p className="text-xs break-words text-muted">
                        {locale === "en" ? item.body_en : item.body_id}
                      </p>
                      {item.trip_id && item.trips && (
                        <Link
                          href={`/trips/${item.trip_id}`}
                          className={`tap-target inline-flex items-center self-start text-xs font-semibold break-words text-foreground underline underline-offset-4 ${focusRing}`}
                        >
                          {item.trips.name}
                        </Link>
                      )}
                      <p className="text-xs text-muted">
                        {t("created", {
                          date: format.dateTime(new Date(item.created_at), {
                            dateStyle: "medium",
                            timeZone: "Asia/Jakarta",
                          }),
                        })}
                      </p>
                      {!item.is_read && (
                        <form action={markRead} className="mt-2">
                          <button type="submit" className={outlinePill}>
                            {t("markRead")}
                          </button>
                        </form>
                      )}
                    </div>
                    {!item.is_read && (
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <AppBottomNav activeHref="/notifications" />
    </div>
  );
}
