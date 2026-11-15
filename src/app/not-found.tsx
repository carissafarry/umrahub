import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { TripIcon } from "@/components/ui/icons";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <ErrorCard
      title={t("title")}
      description={t("description")}
      icon={<TripIcon className="size-6" />}
    >
      <ButtonLink href="/dashboard">{t("cta")}</ButtonLink>
    </ErrorCard>
  );
}
