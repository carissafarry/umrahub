"use client";

import { useTranslations } from "next-intl";
import { ErrorCard } from "@/components/ui/ErrorCard";

// Calm fallback when a catalogue item can't load; never shows the raw error.
export default function CatalogItemError({ reset }: { reset: () => void }) {
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
