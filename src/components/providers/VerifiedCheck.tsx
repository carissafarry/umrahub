import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui/icons";

// The "Terverifikasi" check: an icon plus a text name, never colour alone.
export function VerifiedCheck({ className = "size-5" }: { className?: string }) {
  const t = useTranslations("ProviderProfile");
  return (
    <span
      role="img"
      aria-label={t("verifiedBadge")}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-success-soft text-success ${className}`}
    >
      <CheckIcon className="size-3/4" />
    </span>
  );
}
