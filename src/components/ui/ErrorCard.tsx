"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { FlagIcon } from "@/components/ui/icons";

// Calm card for error boundaries and the not-found page: icon tile, title,
// muted description and one action. Pass `onRetry` for the outline retry pill,
// or `children` for another action (the not-found `ButtonLink`).
export function ErrorCard({
  title,
  description,
  retryLabel,
  onRetry,
  icon = <FlagIcon className="size-6" />,
  children,
}: {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="pt-2 pb-10 lg:pt-8 lg:pb-16">
        <Card className="flex flex-col items-start gap-4 lg:max-w-xl lg:p-7">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"
          >
            {icon}
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-[-0.03em]">
              {title}
            </h1>
            <p className="text-muted">{description}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-surface-raised px-6 font-semibold text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {retryLabel}
            </button>
          )}
          {children}
        </Card>
      </main>
    </div>
  );
}
