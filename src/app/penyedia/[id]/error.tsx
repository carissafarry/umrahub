"use client";

import { useTranslations } from "next-intl";
import { ErrorCard } from "@/components/ui/ErrorCard";

// Calm fallback when a provider profile can't load; never shows the raw error.
export default function ProviderProfileError({
  reset,
}: {
  reset: () => void;
}) {
  const t = useTranslations("ProviderProfile.error");

  return (
    <ErrorCard
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
      onRetry={reset}
    />
  );
}
