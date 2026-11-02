"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { TrashIcon } from "@/components/ui/icons";
import {
  deleteStepComment,
  postStepComment,
  type PostCommentResult,
} from "@/lib/steps/actions";
import {
  maxCommentLength,
  parseCommentContent,
  type StepComment,
} from "@/lib/steps/comments";

type PostError = Extract<PostCommentResult, { ok: false }>["error"];

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";
const dialogClassName =
  "m-auto w-[calc(100%-2.5rem)] max-w-md rounded-3xl bg-surface p-6 text-foreground shadow-card backdrop:bg-foreground/60";
const pillClassName = `tap-target inline-flex items-center justify-center gap-2 rounded-full px-6 font-semibold disabled:opacity-60 ${focusRing}`;
const neutralClassName = `${pillClassName} border border-border bg-surface text-foreground shadow-card`;
// Destructive: ink-filled, never indigo (the design system has no danger colour).
const destructiveClassName = `${pillClassName} bg-foreground text-background`;

// The tips section of /steps/[id]: post form, then the newest comments.
// Comment text is plain React text, never markdown, HTML or links.
export function StepComments({
  stepId,
  comments,
}: {
  stepId: string;
  comments: StepComment[];
}) {
  const t = useTranslations("StepComments");

  return (
    <Card as="section" className="flex flex-col gap-5 lg:p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-sm text-muted">{t("visibilityNote")}</p>
      </div>
      <CommentForm stepId={stepId} />
      {comments.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {comments.map((comment) => (
            <CommentItem key={comment.id} stepId={stepId} comment={comment} />
          ))}
        </ul>
      ) : (
        <p className="text-muted">{t("empty")}</p>
      )}
    </Card>
  );
}

function CommentForm({ stepId }: { stepId: string }) {
  const t = useTranslations("StepComments");
  const id = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<PostError | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseCommentContent(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      // Success revalidates the page, which adds the comment to the list.
      const result = await postStepComment(stepId, parsed.content);
      if (result.ok) setDraft("");
      else setError(result.error);
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor={`${id}-content`} className="font-medium">
        {t("label")}
      </label>
      <textarea
        id={`${id}-content`}
        rows={4}
        maxLength={maxCommentLength}
        value={draft}
        aria-invalid={error === "empty" || error === "tooLong"}
        aria-describedby={`${id}-count ${id}-error`}
        onChange={(event) => setDraft(event.target.value)}
        className={`tap-target w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground ${focusRing}`}
      />
      <p id={`${id}-count`} className="self-end text-sm text-muted">
        {t("count", { count: draft.length, max: maxCommentLength })}
      </p>
      <p
        id={`${id}-error`}
        aria-live="polite"
        className="font-medium text-foreground"
      >
        {error && t(`errors.${error}`, { max: maxCommentLength })}
      </p>
      <Button type="submit" disabled={isPending} className="md:self-start">
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

function CommentItem({
  stepId,
  comment,
}: {
  stepId: string;
  comment: StepComment;
}) {
  const t = useTranslations("StepComments");
  const format = useFormatter();
  const name = comment.authorName || t("anonymous");

  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      {comment.authorAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Google profile photo (user content), not decorative art
        <img
          src={comment.authorAvatarUrl}
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
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold break-words">{name}</span>
            <time dateTime={comment.createdAt} className="text-sm text-muted">
              {format.dateTime(new Date(comment.createdAt), {
                dateStyle: "medium",
                timeZone: "Asia/Jakarta",
              })}
            </time>
          </div>
          {comment.isOwn && (
            <DeleteComment commentId={comment.id} stepId={stepId} />
          )}
        </div>
        <p className="whitespace-pre-line break-words">{comment.content}</p>
      </div>
    </li>
  );
}

// Delete for one of the user's own comments, confirmed in a modal
// <dialog>. Closing it returns focus to the button that opened it.
function DeleteComment({
  commentId,
  stepId,
}: {
  commentId: string;
  stepId: string;
}) {
  const t = useTranslations("StepComments");
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function open(event: { currentTarget: HTMLButtonElement }) {
    openerRef.current = event.currentTarget;
    setFailed(false);
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }

  function handleDelete() {
    setFailed(false);
    startDelete(async () => {
      // Success revalidates the page, which drops this comment.
      const result = await deleteStepComment(commentId, stepId);
      if (result.ok) dialogRef.current?.close();
      else setFailed(true);
    });
  }

  return (
    <>
      <IconButton label={t("delete.open")} onClick={open} className="shrink-0">
        <TrashIcon className="size-5" />
      </IconButton>
      <dialog
        ref={dialogRef}
        role="alertdialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className={dialogClassName}
        onClose={() => openerRef.current?.focus()}
        onCancel={(event) => {
          if (isDeleting) event.preventDefault();
        }}
      >
        <div className="flex flex-col gap-5">
          <h2 id={`${id}-title`} className="text-xl font-semibold">
            {t("delete.title")}
          </h2>
          <p id={`${id}-body`} className="text-muted">
            {t("delete.body")}
          </p>
          {failed && (
            <p role="alert" className="font-medium text-foreground">
              {t("delete.failed")}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <button
              ref={cancelRef}
              type="button"
              className={neutralClassName}
              disabled={isDeleting}
              onClick={() => dialogRef.current?.close()}
            >
              {t("delete.cancel")}
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
    </>
  );
}
