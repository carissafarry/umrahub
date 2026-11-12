"use client";

import { useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/IconButton";
import { CloseIcon, SignOutIcon } from "@/components/ui/icons";
import { signOut } from "@/lib/auth/actions";
import type { UserProfile } from "@/lib/auth/profile";
import { LanguageToggle } from "./LanguageToggle";

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Avatar({ profile, size }: { profile: UserProfile; size: 40 | 56 }) {
  const sizeClassName = size === 56 ? "size-14 text-xl" : "size-10";
  return profile.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote Google profile photo (user content), not decorative art
    <img
      src={profile.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      width={size}
      height={size}
      className={`${sizeClassName} shrink-0 rounded-full bg-surface object-cover`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-full bg-tile-violet font-semibold text-tile-violet-foreground`}
    >
      {profile.name.charAt(0).toUpperCase()}
    </span>
  );
}

// The header's round profile button and the account bottom sheet it opens:
// name, language switch and sign-out. A native modal <dialog>: Escape, the
// close button and the backdrop close it; focus returns to the profile button.
export function AccountSheet({ profile }: { profile: UserProfile }) {
  const t = useTranslations("Header");
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function open() {
    dialogRef.current?.showModal();
    closeRef.current?.focus();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        aria-label={t("accountLabel")}
        aria-haspopup="dialog"
        onClick={open}
        className={`tap-target inline-flex size-12 shrink-0 items-center justify-center rounded-full ${focusRing}`}
      >
        <Avatar profile={profile} size={40} />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onClose={() => openerRef.current?.focus()}
        // Only a click on the backdrop targets the <dialog> itself.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-[2rem] bg-background p-0 text-foreground shadow-float backdrop:bg-foreground/60"
      >
        <div className="flex flex-col gap-5 px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <span
            aria-hidden="true"
            className="mx-auto h-1.5 w-10 rounded-full bg-border"
          />
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${id}-title`} className="text-lg font-bold">
              {t("accountSheetTitle")}
            </h2>
            <IconButton
              ref={closeRef}
              label={t("close")}
              onClick={close}
            >
              <CloseIcon className="size-5" />
            </IconButton>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <Avatar profile={profile} size={56} />
            <p className="min-w-0 truncate text-base font-semibold">
              {profile.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.375rem] border border-surface-line bg-surface p-3 pl-4">
            <span className="font-medium">{t("languageLabel")}</span>
            <LanguageToggle />
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className={`tap-target inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface-raised px-5 font-semibold text-foreground ${focusRing}`}
            >
              <SignOutIcon className="size-5" />
              {t("signOut")}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
