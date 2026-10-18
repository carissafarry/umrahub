import { getTranslations } from "next-intl/server";
import { IconButton } from "@/components/ui/IconButton";
import { SignOutIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/auth/actions";
import type { UserProfile } from "@/lib/auth/profile";

// Signed-in user block: its own full-width row on phones, beside the
// language toggle from `md` up.
export async function UserMenu({ profile }: { profile: UserProfile }) {
  const t = await getTranslations("Header");

  return (
    <div
      role="group"
      aria-label={t("accountLabel")}
      className="flex w-full min-w-0 items-center gap-3 md:w-auto"
    >
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Google profile photo (user content), not decorative art
        <img
          src={profile.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-full bg-surface object-cover shadow-card"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tile-violet font-semibold text-tile-violet-foreground shadow-card"
        >
          {profile.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-medium md:max-w-48 lg:max-w-sm">
        {profile.name}
      </span>
      <form action={signOut} className="shrink-0">
        <IconButton type="submit" label={t("signOut")} className="lg:hidden">
          <SignOutIcon className="size-5" />
        </IconButton>
        <button
          type="submit"
          className="tap-target hidden items-center gap-2 rounded-full bg-surface px-5 font-medium text-foreground shadow-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary lg:inline-flex"
        >
          <SignOutIcon className="size-5" />
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
