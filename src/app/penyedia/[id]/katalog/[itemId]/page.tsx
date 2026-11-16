import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppBottomNav } from "@/components/AppNav";
import { CatalogItemDetail } from "@/components/providers/CatalogItemDetail";
import { loadCatalogItem } from "@/lib/providers/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ProviderProfile.catalogItem");
  return { title: t("metaTitle") };
}

export default async function CatalogItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const data = await loadCatalogItem(id, itemId);
  return (
    <>
      <CatalogItemDetail {...data} />
      <AppBottomNav activeHref="/penyedia" />
    </>
  );
}
