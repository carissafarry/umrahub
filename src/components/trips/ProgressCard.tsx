import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";

type ProgressCardProps = {
  done: number;
  total: number;
  percent: number;
  budgetHref: string;
};

// Overall progress, the budget link and the cost disclaimer: on top on phones
// and tablets, the sticky side summary on desktop.
export async function ProgressCard({
  done,
  total,
  percent,
  budgetHref,
}: ProgressCardProps) {
  const t = await getTranslations("Checklist");

  return (
    <Card as="section" className="flex flex-col gap-3 lg:p-7">
      <h2 className="sr-only">{t("progressTitle")}</h2>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold">{t("progressText", { done, total })}</p>
        <p className="text-2xl font-bold">{t("progressPercent", { percent })}</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t("progressLabel")}
        className="h-2.5 overflow-hidden rounded-full bg-surface-line"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
      <Link
        href={budgetHref}
        className="tap-target flex items-center justify-between gap-3 rounded-2xl text-sm font-bold text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {t("budgetLink")}
        <ArrowRightIcon className="size-4 shrink-0" />
      </Link>
      <p className="text-sm text-muted">
        {t("perPersonNote")} {t("disclaimer")}
      </p>
    </Card>
  );
}
