import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TripBudget } from "@/components/trips/TripBudget";
import { loadTripBudget } from "@/lib/trips/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Budget");
  return { title: t("metaTitle") };
}

export default async function TripBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <TripBudget {...await loadTripBudget((await params).id)} />;
}
