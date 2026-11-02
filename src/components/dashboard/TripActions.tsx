"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/IconButton";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import {
  deleteTrip,
  renameTrip,
  type RenameTripResult,
} from "@/lib/dashboard/actions";
import { maxTripNameLength, parseTripName } from "@/lib/dashboard/validate";

type RenameError = Extract<RenameTripResult, { ok: false }>["error"];

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";
const dialogClassName =
  "m-auto w-[calc(100%-2.5rem)] max-w-md rounded-3xl bg-surface p-6 text-foreground shadow-card backdrop:bg-foreground/60";
const pillClassName = `tap-target inline-flex items-center justify-center gap-2 rounded-full px-6 font-semibold disabled:opacity-60 ${focusRing}`;
const neutralClassName = `${pillClassName} border border-border bg-surface text-foreground shadow-card`;
// Destructive: ink-filled, never indigo (the design system has no danger colour).
const destructiveClassName = `${pillClassName} bg-foreground text-background`;

// Rename and delete for one dashboard trip, each confirmed in a modal
// <dialog>. Closing a dialog returns focus to the button that opened it.
export function TripActions({ tripId, name }: { tripId: string; name: string }) {
  const t = useTranslations("Dashboard");
  const id = useId();

  const renameRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const [draft, setDraft] = useState(name);
  const [renameError, setRenameError] = useState<RenameError | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [isRenaming, startRename] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function openRename(event: { currentTarget: HTMLButtonElement }) {
    openerRef.current = event.currentTarget;
    setDraft(name);
    setRenameError(null);
    renameRef.current?.showModal();
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  function openDelete(event: { currentTarget: HTMLButtonElement }) {
    openerRef.current = event.currentTarget;
    setDeleteFailed(false);
    deleteRef.current?.showModal();
    cancelDeleteRef.current?.focus();
  }

  function returnFocus() {
    openerRef.current?.focus();
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseTripName(draft);
    if (!parsed.ok) {
      setRenameError("invalid");
      return;
    }
    setRenameError(null);
    startRename(async () => {
      const result = await renameTrip(tripId, parsed.value);
      if (result.ok) renameRef.current?.close();
      else setRenameError(result.error);
    });
  }

  function handleDelete() {
    setDeleteFailed(false);
    startDelete(async () => {
      // Success revalidates /dashboard, which drops this card.
      const result = await deleteTrip(tripId);
      if (result.ok) deleteRef.current?.close();
      else setDeleteFailed(true);
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <IconButton label={t("rename.open", { name })} onClick={openRename}>
        <PencilIcon className="size-5" />
      </IconButton>
      <IconButton label={t("delete.open", { name })} onClick={openDelete}>
        <TrashIcon className="size-5" />
      </IconButton>

      <dialog
        ref={renameRef}
        aria-labelledby={`${id}-rename-title`}
        className={dialogClassName}
        onClose={returnFocus}
        onCancel={(event) => {
          if (isRenaming) event.preventDefault();
        }}
      >
        <form noValidate onSubmit={handleRename} className="flex flex-col gap-5">
          <h2 id={`${id}-rename-title`} className="text-xl font-semibold">
            {t("rename.title")}
          </h2>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-rename-input`} className="font-medium">
              {t("rename.label")}
            </label>
            <input
              ref={inputRef}
              id={`${id}-rename-input`}
              type="text"
              autoComplete="off"
              maxLength={maxTripNameLength}
              value={draft}
              aria-invalid={renameError === "invalid"}
              aria-describedby={
                renameError ? `${id}-rename-error` : undefined
              }
              onChange={(event) => setDraft(event.target.value)}
              className={`tap-target w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground ${focusRing}`}
            />
          </div>
          {renameError && (
            <p
              id={`${id}-rename-error`}
              role="alert"
              className="font-medium text-foreground"
            >
              {t(`rename.errors.${renameError}`)}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              className={neutralClassName}
              disabled={isRenaming}
              onClick={() => renameRef.current?.close()}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className={neutralClassName}
              disabled={isRenaming}
            >
              {isRenaming ? t("rename.saving") : t("rename.save")}
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={deleteRef}
        role="alertdialog"
        aria-labelledby={`${id}-delete-title`}
        aria-describedby={`${id}-delete-body`}
        className={dialogClassName}
        onClose={returnFocus}
        onCancel={(event) => {
          if (isDeleting) event.preventDefault();
        }}
      >
        <div className="flex flex-col gap-5">
          <h2 id={`${id}-delete-title`} className="text-xl font-semibold">
            {t("delete.title")}
          </h2>
          <p id={`${id}-delete-body`} className="break-words text-muted">
            {t("delete.body", { name })}
          </p>
          {deleteFailed && (
            <p role="alert" className="font-medium text-foreground">
              {t("delete.failed")}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <button
              ref={cancelDeleteRef}
              type="button"
              className={neutralClassName}
              disabled={isDeleting}
              onClick={() => deleteRef.current?.close()}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className={destructiveClassName}
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <TrashIcon className="size-5" />
              {isDeleting ? t("delete.deleting") : t("delete.confirm")}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
