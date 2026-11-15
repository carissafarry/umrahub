"use client";

import { useTranslations } from "next-intl";
import { ErrorCard } from "@/components/ui/ErrorCard";

// Calm fallback when the notifications can't load; never shows the raw error.
export default function NotificationsError({ reset }: { reset: () => void }) {
  const t = useTranslations("Notifications.error");

  return (
    <ErrorCard
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
      onRetry={reset}
    />
  );
}
