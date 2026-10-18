import { NextRequest } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./middleware";

const cacheHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

let signedIn = false;

// Simulates a token refresh: getUser() writes a cookie plus the cache headers.
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    { cookies }: { cookies: CookieMethodsServer },
  ) => ({
    auth: {
      async getUser() {
        await cookies.setAll?.(
          [{ name: "sb-test-auth-token", value: "refreshed", options: {} }],
          cacheHeaders,
        );
        return { data: { user: signedIn ? { id: "u1" } : null } };
      },
    },
  }),
}));

function expectCacheHeaders(response: Response) {
  for (const [key, value] of Object.entries(cacheHeaders)) {
    expect(response.headers.get(key)).toBe(value);
  }
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets refreshed cookies and cache headers on the pass-through response", async () => {
    signedIn = true;
    const response = await updateSession(
      new NextRequest("http://localhost/dashboard"),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed",
    );
    expectCacheHeaders(response);
  });

  it("copies cookies and cache headers onto the signed-out redirect", async () => {
    signedIn = false;
    const response = await updateSession(
      new NextRequest("http://localhost/dashboard"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "refreshed",
    );
    expectCacheHeaders(response);
  });
});
