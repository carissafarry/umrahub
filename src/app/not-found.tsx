import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/Button";

// Decorative sky: clouds, a crescent, a dotted path that ends in a map pin and
// a mosque silhouette. Fills come from tokens (`fill-surface`, `fill-primary`).
function SkyScene() {
  return (
    <svg
      viewBox="0 0 520 520"
      preserveAspectRatio="xMidYMax slice"
      focusable="false"
      aria-hidden="true"
      className="absolute inset-0 size-full"
    >
      <g className="fill-surface" opacity=".6">
        <ellipse cx="110" cy="130" rx="62" ry="17" />
        <ellipse cx="156" cy="120" rx="42" ry="15" />
        <ellipse cx="400" cy="90" rx="54" ry="15" />
        <ellipse cx="438" cy="100" rx="34" ry="12" />
        <ellipse cx="330" cy="250" rx="48" ry="13" />
      </g>
      <path
        d="M392 168a38 38 0 1 0 36 52 30 30 0 1 1-36-52z"
        className="fill-surface"
        opacity=".9"
      />
      <path
        d="M64 470C120 400 170 430 215 380S300 300 330 270"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="2 9"
        strokeLinecap="round"
        className="text-surface"
      />
      <g transform="translate(330 214)">
        <path
          d="M0 56C-24 28-30 16-30 2a30 30 0 1 1 60 0c0 14-6 26-30 54z"
          className="fill-primary"
        />
        <circle cx="0" cy="2" r="11" className="fill-surface" />
      </g>
      <g className="fill-surface" opacity=".92">
        <path d="M96 520V428c0-34 24-58 58-58s58 24 58 58v92z" />
        <rect x="226" y="396" width="14" height="124" />
        <path d="m222 396 11-24 11 24z" />
        <rect x="60" y="414" width="14" height="106" />
        <path d="m56 414 11-22 11 22z" />
        <path d="M240 520v-70c0-26 18-44 44-44s44 18 44 44v70z" />
        <rect x="150" y="350" width="6" height="20" />
        <rect x="0" y="498" width="520" height="22" />
      </g>
    </svg>
  );
}

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 pt-2 lg:flex-row lg:items-center lg:gap-12 lg:px-14 lg:pt-6 lg:pb-16">
      <section className="relative min-w-0 lg:flex-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 -left-2 text-[186px] leading-none font-extrabold tracking-[-0.06em] whitespace-nowrap text-accent-soft opacity-75 select-none lg:top-1/2 lg:-left-6 lg:-translate-y-[54%] lg:text-[306px]"
        >
          404
        </span>
        <div className="relative pt-[100px] pb-6 lg:py-0">
          <p className="mb-3 hidden rounded-full bg-accent-soft px-3 py-1 text-[0.8125rem] font-semibold text-accent lg:inline-block">
            {t("badge")}
          </p>
          <h1 className="mb-3 text-balance text-[2rem] leading-[1.1] font-extrabold tracking-[-0.03em] lg:mb-4 lg:text-[3.25rem] lg:leading-[1.08]">
            {t("title")}
          </h1>
          <p className="mb-6 max-w-[27.5rem] text-base leading-[1.55] text-muted lg:mb-8 lg:text-lg">
            {t("description")}
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <ButtonLink href="/dashboard">{t("cta")}</ButtonLink>
            <Link
              href="/trips"
              className="tap-target flex min-h-12 items-center justify-center rounded-full border border-border bg-surface-raised px-6 text-[0.9375rem] font-semibold text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("secondary")}
            </Link>
          </div>
        </div>
      </section>
      <div
        aria-hidden="true"
        className="relative -mx-4 mt-auto h-[246px] overflow-hidden rounded-t-[2rem] bg-gradient-to-b from-sky-day-from to-sky-day-to lg:mx-0 lg:mt-0 lg:h-[520px] lg:min-w-0 lg:flex-1 lg:rounded-[2rem]"
      >
        <SkyScene />
      </div>
    </main>
  );
}
