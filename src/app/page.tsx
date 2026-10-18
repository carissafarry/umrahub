import type { ComponentType } from "react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  BookIcon,
  ChecklistIcon,
  SparkleIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { signInWithGoogle } from "@/lib/auth/actions";

// `id` is the message key under Home.benefits and the stable React key.
const benefits: {
  id: "checklist" | "costs" | "guide";
  icon: ComponentType<{ className?: string }>;
  tile: string;
}[] = [
  {
    id: "checklist",
    icon: ChecklistIcon,
    tile: "bg-tile-green text-tile-green-foreground",
  },
  {
    id: "costs",
    icon: WalletIcon,
    tile: "bg-tile-amber text-tile-amber-foreground",
  },
  {
    id: "guide",
    icon: BookIcon,
    tile: "bg-tile-blue text-tile-blue-foreground",
  },
];

const heroChips = [
  {
    icon: ChecklistIcon,
    tile: "bg-tile-green text-tile-green-foreground",
    position: "top-6 left-2",
  },
  {
    icon: WalletIcon,
    tile: "bg-tile-amber text-tile-amber-foreground",
    position: "top-0 right-6",
  },
  {
    icon: BookIcon,
    tile: "bg-tile-blue text-tile-blue-foreground",
    position: "right-1 bottom-8",
  },
  {
    icon: SparkleIcon,
    tile: "bg-tile-violet text-tile-violet-foreground",
    position: "bottom-2 left-10",
  },
];

// Decorative CSS/SVG composition: soft blobs and swirls around a Kaaba
// silhouette, with floating icon chips.
function Hero() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-80 lg:max-w-md"
    >
      <div className="absolute inset-6 rounded-full bg-tile-violet opacity-80 blur-2xl" />
      <div className="absolute top-10 right-4 size-36 rounded-full bg-tile-blue opacity-70 blur-2xl" />
      <svg
        viewBox="0 0 200 200"
        fill="none"
        focusable="false"
        className="absolute inset-0 size-full text-tile-violet-foreground"
      >
        <path
          d="M30 120c10-55 70-85 120-60 30 15 30 55 0 70-40 20-95 5-105-25"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.12"
        />
        <path
          d="M45 70c35-35 105-30 120 15 10 30-20 60-60 62-35 2-65-15-70-40"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.2"
        />
      </svg>
      <svg
        viewBox="0 0 200 200"
        focusable="false"
        className="absolute inset-0 size-full"
      >
        <ellipse cx="100" cy="150" rx="62" ry="12" className="fill-surface" />
        <path d="M60 78 100 66l40 12v66l-40 10-40-10Z" className="fill-nav" />
        <path
          d="M100 66l40 12v66l-40 10Z"
          className="fill-nav-foreground"
          opacity="0.12"
        />
        <path
          d="M60 92 100 102l40-10v8l-40 10-40-10Z"
          className="fill-tile-amber-foreground"
        />
        <path d="M80 149v-24l10 2v24Z" className="fill-tile-amber" />
      </svg>
      {heroChips.map(({ icon: Icon, tile, position }) => (
        <div
          key={position}
          className={`absolute ${position} flex size-16 items-center justify-center rounded-full bg-surface shadow-card`}
        >
          <span
            className={`flex size-11 items-center justify-center rounded-full ${tile}`}
          >
            <Icon className="size-6" />
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string | string[] }>;
}) {
  const authError = (await searchParams).auth_error !== undefined;
  const t = await getTranslations("Home");
  const tFooter = await getTranslations("Footer");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-1 flex-col gap-10 pt-2 pb-10 lg:gap-20 lg:pt-8 lg:pb-16">
        <section className="grid items-center gap-4 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-last">
            <Hero />
          </div>
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <h1 className="text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="text-lg text-muted md:max-w-xl lg:text-xl">
              {t("description")}
            </p>
            <p
              lang="ar"
              dir="rtl"
              className="font-arabic text-2xl leading-loose lg:text-left"
            >
              لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ
            </p>
            <div className="mt-6 flex w-full flex-col gap-3 md:items-center lg:items-start">
              <form action={signInWithGoogle} className="contents">
                <Button type="submit">{t("signIn")}</Button>
              </form>
              {authError && (
                <p
                  role="alert"
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-center font-medium text-foreground shadow-card lg:text-left"
                >
                  {t("signInError")}
                </p>
              )}
              <p className="text-center text-muted lg:text-left">
                {t("signInNote")}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="manfaat" className="flex flex-col gap-4">
          <h2 id="manfaat" className="text-xl font-semibold lg:text-2xl">
            {t("benefitsHeading")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3 lg:gap-6">
            {benefits.map(({ id, icon: Icon, tile }) => (
              <Card
                as="li"
                key={id}
                className="flex items-start gap-4 md:flex-col lg:p-7"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tile}`}
                >
                  <Icon className="size-6" />
                </span>
                <div>
                  <h3 className="font-semibold">
                    {t(`benefits.${id}.title`)}
                  </h3>
                  <p className="mt-1 text-muted">
                    {t(`benefits.${id}.description`)}
                  </p>
                </div>
              </Card>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-muted">
        {tFooter("text", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
