import type { ElementType, ReactNode } from "react";

type CardProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

export function Card({ as: Tag = "div", className = "", children }: CardProps) {
  return (
    <Tag className={`rounded-[1.75rem] border border-surface-line bg-surface p-5 ${className}`}>
      {children}
    </Tag>
  );
}
