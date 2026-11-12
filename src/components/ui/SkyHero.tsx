import type { ReactNode } from "react";

// Clouds and a mosque silhouette at the bottom of the sky hero; decorative only.
export function HeroArt() {
  return (
    <svg
      viewBox="0 0 390 120"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-30 w-full text-primary-foreground lg:h-44"
    >
      <g fill="currentColor" opacity=".55">
        <ellipse cx="70" cy="86" rx="46" ry="13" />
        <ellipse cx="104" cy="80" rx="32" ry="12" />
        <ellipse cx="300" cy="62" rx="40" ry="11" />
      </g>
      <g fill="currentColor" opacity=".7">
        <path d="M268 120V84c0-14 10-24 24-24s24 10 24 24v36z" />
        <rect x="324" y="68" width="8" height="52" />
        <path d="m322 68 6-12 6 12z" />
        <rect x="252" y="76" width="8" height="44" />
        <path d="m250 76 6-10 6 10z" />
      </g>
    </svg>
  );
}

// The day-sky hero with its art. `data-sky-hero` makes the root layout's
// SiteHeader overlay it (transparent, brand in white), so the caller pads the
// top for the header; content needs `relative z-10` to sit above the art.
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
