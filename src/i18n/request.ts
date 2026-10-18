import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import fallbackMessages from "../../messages/id.json";
import { localeCookieName, resolveLocale } from "./config";

// Looks up a dotted key path in the Indonesian messages.
function fallbackMessage(path: string): string | undefined {
  let node: unknown = fallbackMessages;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(localeCookieName)?.value);

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
