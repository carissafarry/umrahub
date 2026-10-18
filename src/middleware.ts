import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Auth session refresh and route protection only; no locale handling.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next.js assets, Vercel Analytics, the favicon and static images.
    "/((?!_next/static|_next/image|_vercel|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
