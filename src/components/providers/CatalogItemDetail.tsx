import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { CatalogItemData } from "@/lib/providers/queries";

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

// The /penyedia/[id]/katalog/[itemId] page body: image, title, the provider
// linking back to the profile, and the full description. No CTA.
export function CatalogItemDetail({ provider, item }: CatalogItemData) {
  const t = useTranslations("ProviderProfile");
  const en = useLocale() === "en";
  const title = en ? (item.title_en ?? item.title_id) : item.title_id;
  const description = en
    ? (item.description_en ?? item.description_id)
    : item.description_id;

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-8 lg:max-w-[75rem] lg:px-10">
      <main className="flex flex-col gap-6 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pt-8 lg:pb-16">
        <Link
          href={`/penyedia/${provider.id}`}
          className={`tap-target inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground ${focusRing}`}
        >
          <ArrowRightIcon className="size-4 rotate-180" />
          {t("catalogItem.backToProfile")}
        </Link>

        <div className="flex max-w-3xl flex-col gap-4">
          {item.image_url && (
            // eslint-disable-next-line @next/next/no-img-element -- remote catalogue photo; no next/image host config
            <img
              src={item.image_url}
              alt={title}
              width={1280}
              height={720}
              loading="lazy"
              className="aspect-video w-full rounded-[1.75rem] bg-surface object-cover"
            />
          )}
          <h1 className="text-3xl leading-tight font-bold lg:text-4xl">
            {title}
          </h1>
          <p className="text-muted">
            {t("catalogItem.by")}{" "}
            <Link
              href={`/penyedia/${provider.id}`}
              className={`tap-target inline-flex items-center rounded-xl font-semibold text-foreground underline underline-offset-4 ${focusRing}`}
            >
              {provider.name}
            </Link>
          </p>
          <p className="break-words whitespace-pre-line">{description}</p>
        </div>
      </main>
    </div>
  );
}
