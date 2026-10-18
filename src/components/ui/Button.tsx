import type { ButtonHTMLAttributes } from "react";
import { ArrowRightIcon } from "./icons";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`tap-target relative flex min-h-14 w-full items-center md:w-auto md:min-w-80 justify-center rounded-full bg-primary bg-linear-to-r from-primary to-primary-strong py-2 pr-16 pl-16 text-lg font-semibold text-primary-foreground shadow-card focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary-foreground text-primary"
      >
        <ArrowRightIcon className="size-5" />
      </span>
    </button>
  );
}
