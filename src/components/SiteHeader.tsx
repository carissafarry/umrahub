import Link from "next/link";
import { DomeIcon } from "@/components/ui/icons";
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

// One row on every width, never a bar: no background or border. When the
// page renders a `SkyHero` (`data-sky-hero`, on `/` and `/dashboard`), the
// `group-has-*/body` classes lift the header over the top of the hero and
// turn the brand white; elsewhere it sits on the plain white page in ink.
// Signed in: brand, top nav (lg), bell and the profile button that opens the
// account sheet (language, sign-out). Signed out: brand and language toggle.
export async function SiteHeader() {
  const user = await getSignedInUser();

  return (
    <header className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-3 group-has-[[data-sky-hero]]/body:absolute group-has-[[data-sky-hero]]/body:inset-x-0 group-has-[[data-sky-hero]]/body:top-0 group-has-[[data-sky-hero]]/body:z-20 md:max-w-3xl md:px-8 md:group-has-[[data-sky-hero]]/body:px-16 lg:max-w-6xl lg:gap-4 lg:px-10 lg:py-5 lg:group-has-[[data-sky-hero]]/body:px-20">
      <Link
        href="/"
        className="tap-target mr-auto flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight text-foreground group-has-[[data-sky-hero]]/body:text-primary-foreground group-has-[[data-sky-hero]]/body:[text-shadow:0_1px_12px_color-mix(in_srgb,var(--accent)_45%,transparent)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary lg:mr-0 lg:text-2xl"
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-accent group-has-[[data-sky-hero]]/body:border-transparent"
        >
          <DomeIcon className="size-[1.125rem]" />
        </span>
        Umra Hub
      </Link>
      {user ? (
        <>
          <AppTopNav className="rounded-full border border-border bg-surface-raised p-1 lg:mr-auto lg:ml-4" />
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
