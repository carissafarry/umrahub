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
      <div className="mx-auto w-full max-w-md px-5 md:max-w-3xl md:px-16 lg:max-w-6xl lg:px-20">
        {children}
      </div>
      <HeroArt />
    </div>
  );
}
