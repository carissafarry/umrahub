"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { reportStepContent } from "@/lib/steps/actions";
import { maxFlagReasonLength, parseFlagReason } from "@/lib/steps/flags";

type ReportError = "empty" | "tooLong" | "failed";

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";
const dialogClassName =
  "m-auto w-[calc(100%-2.5rem)] max-w-md rounded-3xl bg-surface p-6 text-foreground shadow-card backdrop:bg-nav/60";
const pillClassName = `tap-target inline-flex items-center justify-center gap-2 rounded-full px-6 font-semibold disabled:opacity-60 ${focusRing}`;
const neutralClassName = `${pillClassName} border border-border bg-surface text-foreground shadow-card`;
// Ink-filled, never indigo: the comment form owns the page's indigo CTA.
const inkClassName = `${pillClassName} bg-foreground text-background`;

// "Report outdated info" for one step: a neutral button that opens a modal
// <dialog> with a reason. Closing the dialog returns focus to the button.
export function ReportOutdatedInfo({ stepId }: { stepId: string }) {
  const t = useTranslations("ContentFlags");
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<ReportError | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function open() {
    setError(null);
    setSent(false);
    dialogRef.current?.showModal();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseFlagReason(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reportStepContent(stepId, parsed.reason);
      if (result.ok) {
        setDraft("");
        setSent(true);
        dialogRef.current?.close();
      } else {
        // A bad step id is not the user's to fix: show the generic error.
        setError(result.error === "invalid" ? "failed" : result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <button
        ref={triggerRef}
        type="button"
        className={`${neutralClassName} self-start`}
        onClick={open}
      >
        {t("button")}
      </button>
      <p aria-live="polite" className="font-medium text-foreground">
        {sent && t("success")}
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        className={dialogClassName}
        onClose={() => triggerRef.current?.focus()}
        onCancel={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id={`${id}-title`} className="text-xl font-semibold">
              {t("title")}
            </h2>
            <p className="text-muted">{t("intro")}</p>
          </div>
          <div className="flex flex-col gap-3">
            <label htmlFor={`${id}-reason`} className="font-medium">
              {t("label")}
            </label>
            <textarea
              id={`${id}-reason`}
              rows={4}
              maxLength={maxFlagReasonLength}
              value={draft}
              aria-invalid={error === "empty" || error === "tooLong"}
              aria-describedby={`${id}-count ${id}-error`}
              onChange={(event) => setDraft(event.target.value)}
              className={`tap-target w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground ${focusRing}`}
            />
            <p id={`${id}-count`} className="self-end text-sm text-muted">
              {t("count", { count: draft.length, max: maxFlagReasonLength })}
            </p>
            <p
              id={`${id}-error`}
              aria-live="polite"
              className="font-medium text-foreground"
            >
              {error && t(`errors.${error}`, { max: maxFlagReasonLength })}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              className={neutralClassName}
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
            >
              {t("cancel")}
            </button>
            <button type="submit" className={inkClassName} disabled={isPending}>
              {isPending ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
