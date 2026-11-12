import type { ComponentProps, ReactNode } from "react";

type IconButtonProps = Omit<
  ComponentProps<"button">,
  "aria-label" | "children"
> & {
  label: string;
  children: ReactNode;
};

export function IconButton({
  label,
  type = "button",
  className = "",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`tap-target inline-flex size-12 items-center justify-center rounded-full bg-surface text-foreground shadow-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
