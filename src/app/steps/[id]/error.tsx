"use client";

import { useTranslations } from "next-intl";
import { ErrorCard } from "@/components/ui/ErrorCard";

// Calm fallback when a step can't load; never shows the raw error.
export default function StepDetailError({ reset }: { reset: () => void }) {
  const t = useTranslations("StepDetail.error");

  return (
    <ErrorCard
      title={t("title")}
      description={t("description")}
      retryLabel={t("retry")}
      onRetry={reset}
    />
  );
}
