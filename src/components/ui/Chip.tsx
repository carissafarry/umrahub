import type { ButtonHTMLAttributes } from "react";

export function chipClassName(selected: boolean) {
  return `tap-target rounded-full border px-4 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${
    selected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-surface-raised text-foreground"
  }`;
}

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  selected?: boolean;
};

export function Chip({
  selected = false,
  className = "",
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`${chipClassName(selected)} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
