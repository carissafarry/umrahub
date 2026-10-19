import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StepDetail } from "@/components/steps/StepDetail";
import { loadStepDetail } from "@/lib/steps/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("StepDetail");
  return { title: t("metaTitle") };
}

export default async function StepDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trip?: string | string[] }>;
}) {
  const { trip } = await searchParams;
  const tripParam = Array.isArray(trip) ? trip[0] : trip;
  return <StepDetail {...await loadStepDetail((await params).id, tripParam)} />;
}
