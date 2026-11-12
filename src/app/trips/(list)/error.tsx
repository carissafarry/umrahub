"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";

// Calm fallback when the trip list can't load; never shows the raw error.
export default function TripsError({ reset }: { reset: () => void }) {
  const t = useTranslations("Dashboard.error");

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="pt-2 pb-10 lg:pt-8 lg:pb-16">
        <Card className="flex flex-col items-start gap-4 lg:max-w-xl lg:p-7">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted">{t("description")}</p>
          <button
            type="button"
            onClick={reset}
            className="tap-target rounded-full border border-border bg-surface px-5 font-medium text-foreground shadow-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("retry")}
          </button>
        </Card>
      </main>
    </div>
  );
}
