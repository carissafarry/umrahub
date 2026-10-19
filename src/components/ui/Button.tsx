import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { ArrowRightIcon } from "./icons";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const buttonClassName =
  "tap-target relative flex min-h-14 w-full items-center md:w-auto md:min-w-80 justify-center rounded-full bg-primary bg-linear-to-r from-primary to-primary-strong py-2 pr-16 pl-16 text-lg font-semibold text-primary-foreground shadow-card focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:opacity-60";

function ArrowBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary-foreground text-primary"
    >
      <ArrowRightIcon className="size-5" />
    </span>
  );
}

export function Button({
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={`${buttonClassName} ${className}`} {...props}>
      {children}
      <ArrowBadge />
    </button>
  );
}

// The same indigo CTA as `Button`, for navigation.
export function ButtonLink({
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link className={`${buttonClassName} ${className}`} {...props}>
      {children}
      <ArrowBadge />
    </Link>
  );
}
