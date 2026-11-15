"use client";

import { useTranslations } from "next-intl";
import { ErrorCard } from "@/components/ui/ErrorCard";

// Calm fallback when the budget can't load; never shows the raw error.
export default function TripBudgetError({ reset }: { reset: () => void }) {
  const t = useTranslations("Budget.error");

  return (
    <ErrorCard
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
      onRetry={reset}
    />
  );
}
