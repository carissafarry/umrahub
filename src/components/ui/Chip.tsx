import type { ButtonHTMLAttributes } from "react";

export function chipClassName(selected: boolean) {
  return `tap-target rounded-full px-5 text-base font-medium shadow-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${
    selected ? "bg-primary text-primary-foreground" : "bg-surface text-foreground"
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
