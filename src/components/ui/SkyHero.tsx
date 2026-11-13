import type { ReactNode } from "react";
import { HeroArt } from "@/components/HeroArt";

export function SkyHero({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-sky-hero=""
      className={`relative overflow-hidden bg-linear-to-b from-sky-day-from to-sky-day-to ${className}`}
    >
      {children}
      <HeroArt />
    </div>
  );
}
