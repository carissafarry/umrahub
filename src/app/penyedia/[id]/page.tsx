import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppBottomNav } from "@/components/AppNav";
import { ProviderProfile } from "@/components/providers/ProviderProfile";
import { loadProviderProfile } from "@/lib/providers/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ProviderProfile");
  return { title: t("metaTitle") };
}

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await loadProviderProfile((await params).id);
  return (
    <>
      <ProviderProfile profile={profile} />
      <AppBottomNav activeHref="/penyedia" />
    </>
  );
}
