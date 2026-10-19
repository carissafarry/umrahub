import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import fallbackMessages from "../../messages/id.json";
import { isLocale, localeCookieName, resolveLocale } from "./config";

// Looks up a dotted key path in the Indonesian messages.
function fallbackMessage(path: string): string | undefined {
  let node: unknown = fallbackMessages;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

// An explicit locale (e.g. `getTranslations({ locale: "en" })`) wins over
// the cookie.
export default getRequestConfig(async ({ locale: explicit }) => {
  const store = await cookies();
  const locale = isLocale(explicit)
    ? explicit
    : resolveLocale(store.get(localeCookieName)?.value);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    onError(error) {
      console.error(error);
    },
    getMessageFallback({ namespace, key }) {
      const path = namespace ? `${namespace}.${key}` : key;
      return fallbackMessage(path) ?? path;
    },
  };
});
