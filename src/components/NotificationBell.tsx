import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BellIcon } from "@/components/ui/icons";
import {
  countUnreadNotifications,
  generateReminders,
} from "@/lib/notifications/queries";

// Round bell link to /notifications for signed-in users, with an ink badge of
// the unread count (never indigo). A failed count query shows no badge.
export async function NotificationBell({
  userId,
  className = "",
}: {
  userId: string;
  className?: string;
}) {
  const t = await getTranslations("Notifications");
  await generateReminders();
  const unread = await countUnreadNotifications(userId);
  const hasUnread = unread !== null && unread > 0;

  return (
    <Link
      href="/notifications"
      aria-label={
        hasUnread ? t("bellLabelUnread", { count: unread }) : t("bellLabel")
      }
      className={`tap-target relative inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      <BellIcon className="size-6" />
      {hasUnread && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-bold text-background ring-2 ring-surface-raised"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
