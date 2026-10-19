import { getFormatter, getTranslations } from "next-intl/server";
import type { YearMonth } from "./validate";

// Default name of a new trip, "Umrah {month} {year}" in the active locale.
export async function defaultTripName({ year, month }: YearMonth) {
  const t = await getTranslations("Onboarding");
  const format = await getFormatter();
  return t("defaultTripName", {
    month: format.dateTime(new Date(Date.UTC(year, month - 1, 1)), {
      month: "long",
      timeZone: "UTC",
    }),
    // A string, so ICU doesn't group it as a number ("2.027").
    year: String(year),
  });
}
