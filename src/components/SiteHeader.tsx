import Link from "next/link";
import { getUserProfile } from "@/lib/auth/profile";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { AppTopNav } from "./AppNav";
import { LanguageToggle } from "./LanguageToggle";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

async function getSignedInUser() {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function SiteHeader() {
  const user = await getSignedInUser();

  return (
    <header className="mx-auto flex w-full max-w-md flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 md:max-w-3xl md:flex-nowrap md:px-8 lg:max-w-6xl lg:px-10 lg:py-6">
      <Link
        href="/"
        className={`tap-target flex items-center text-xl font-bold tracking-tight focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary md:mr-auto lg:text-2xl ${
          user ? "lg:mr-0" : ""
        }`}
      >
        Umra Hub
      </Link>
      {user && <AppTopNav className="lg:mr-auto lg:ml-4" />}
      {user && <NotificationBell userId={user.id} className="ml-auto md:ml-0" />}
      <LanguageToggle />
      {user && <UserMenu profile={getUserProfile(user)} />}
    </header>
  );
}
