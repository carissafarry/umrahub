import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { ArrowRightIcon } from "./icons";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const buttonClassName =
  "tap-target relative flex min-h-14 w-full items-center md:w-auto md:min-w-80 justify-start rounded-full bg-primary py-2 pr-16 pl-6 text-start text-base font-bold text-primary-foreground focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:opacity-60";

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

// The multicolour Google "G"; its four fills are Google's brand colours, the
// only raw colours allowed in the UI.
function GoogleBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-1/2 left-1.5 flex size-[2.625rem] -translate-y-1/2 items-center justify-center rounded-full bg-primary-foreground"
    >
      <svg viewBox="0 0 48 48" focusable="false" className="size-[1.375rem]">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    </span>
  );
}

// The ink pill for "Masuk dengan Google": full width (at most 28rem), a
// centred bold label and the Google badge on the left instead of the arrow.
export function GoogleButton({
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`tap-target relative flex min-h-14 w-full max-w-md items-center justify-center rounded-full bg-primary px-14 py-2 text-center text-base font-bold text-primary-foreground focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:opacity-60 ${className}`}
      {...props}
    >
      <GoogleBadge />
      {children}
    </button>
  );
}

// The same ink pill CTA as `Button`, for navigation.
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
