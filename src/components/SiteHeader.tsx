import Link from "next/link";
import { getUserProfile } from "@/lib/auth/profile";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { AccountSheet } from "./AccountSheet";
import { AppTopNav } from "./AppNav";
import { LanguageToggle } from "./LanguageToggle";
import { NotificationBell } from "./NotificationBell";

async function getSignedInUser() {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// One row on every width. Signed in: wordmark, top nav (lg), bell and the
// profile button that opens the account sheet (language, sign-out). Signed
// out: wordmark and the language toggle.
export async function SiteHeader() {
  const user = await getSignedInUser();

  return (
    <header className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-3 md:max-w-3xl md:px-8 lg:max-w-6xl lg:gap-4 lg:px-10 lg:py-5">
      <Link
        href="/"
        className="tap-target mr-auto flex shrink-0 items-center text-xl font-bold tracking-tight focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary lg:mr-0 lg:text-2xl"
      >
        Umra Hub
      </Link>
      {user ? (
        <>
          <AppTopNav className="lg:mr-auto lg:ml-4" />
          <NotificationBell userId={user.id} />
          <AccountSheet profile={getUserProfile(user)} />
        </>
      ) : (
        <div className="lg:ml-auto">
          <LanguageToggle />
        </div>
      )}
    </header>
  );
}
