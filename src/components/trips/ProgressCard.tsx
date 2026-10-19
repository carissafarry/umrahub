import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";

type ProgressCardProps = { done: number; total: number; percent: number };

// Overall progress plus the cost disclaimer: on top on phones and tablets,
// the sticky side summary on desktop.
export async function ProgressCard({ done, total, percent }: ProgressCardProps) {
  const t = await getTranslations("Checklist");

  return (
    <Card as="section" className="flex flex-col gap-4 lg:p-7">
      <h2 className="text-lg font-semibold">{t("progressTitle")}</h2>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-muted">{t("progressText", { done, total })}</p>
        <p className="text-2xl font-bold">{t("progressPercent", { percent })}</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t("progressLabel")}
        className="h-3 overflow-hidden rounded-full bg-tile-violet"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-muted">
        {t("perPersonNote")} {t("disclaimer")}
      </p>
    </Card>
  );
}
