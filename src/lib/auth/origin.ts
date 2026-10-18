// Origin of the incoming request, so OAuth calls back to the same deploy
// (localhost, a Vercel preview or production).
export function getRequestOrigin(headers: Headers): string {
  const origin = headers.get("origin");
  if (origin) return origin;

  const proto = headers.get("x-forwarded-proto")?.split(",")[0] ?? "https";
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  return `${proto}://${host}`;
}
