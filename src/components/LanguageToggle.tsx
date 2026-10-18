"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { resolveLocale, type Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

const options: readonly { value: Locale; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "en", label: "EN" },
];

export function LanguageToggle() {
  const t = useTranslations("Header");
  const locale = resolveLocale(useLocale());
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <SegmentedControl
      label={t("languageLabel")}
      options={options}
      value={locale}
      onChange={(next) => {
        if (next === locale) return;
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        });
      }}
    />
  );
}
