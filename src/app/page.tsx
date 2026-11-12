import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GoogleButton } from "@/components/ui/Button";
import { SkyHero } from "@/components/ui/SkyHero";
import { BookIcon, ChecklistIcon, WalletIcon } from "@/components/ui/icons";
import { signInWithGoogle } from "@/lib/auth/actions";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// `id` is the message key under Home.benefits and the stable React key.
const benefits: {
  id: "checklist" | "costs" | "guide";
  icon: ComponentType<{ className?: string }>;
  tile: string;
}[] = [
  {
    id: "checklist",
    icon: ChecklistIcon,
    tile: "bg-accent-soft text-accent",
  },
  {
    id: "costs",
    icon: WalletIcon,
    tile: "bg-dusk-tile text-dusk-ink",
  },
  {
    id: "guide",
    icon: BookIcon,
    tile: "bg-accent-soft text-accent",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string | string[] }>;
}) {
  // Signed-in users land on their dashboard.
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  const authError = (await searchParams).auth_error !== undefined;
  const t = await getTranslations("Home");
  const tFooter = await getTranslations("Footer");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-10">
      <main className="flex flex-1 flex-col">
        {/* The top padding leaves room for the SiteHeader overlaid on the sky. */}
        <SkyHero className="h-[20.625rem] px-5 pt-22 md:h-[22rem] md:rounded-t-[2rem] md:px-8 lg:h-[26rem] lg:px-10 lg:pt-28">
          <h1 className="relative z-10 max-w-xl text-[2.375rem] leading-[1.04] font-extrabold tracking-[-0.035em] text-primary-foreground [text-shadow:0_1px_12px_color-mix(in_srgb,var(--accent)_45%,transparent)] md:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
        </SkyHero>

        <div className="relative -mt-7 flex flex-1 flex-col gap-4 rounded-t-[2rem] bg-background px-4 pt-5 pb-8 md:gap-5 md:px-6 lg:gap-6 lg:px-8 lg:pt-8 lg:pb-12">
          <p className="text-[0.9375rem] leading-relaxed text-muted lg:max-w-3xl lg:text-lg">
            {t("description")}
          </p>

          <section aria-labelledby="manfaat">
            <h2 id="manfaat" className="sr-only">
              {t("benefitsHeading")}
            </h2>
            <ul className="grid gap-3 md:grid-cols-3 lg:gap-4">
              {benefits.map(({ id, icon: Icon, tile }) => (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-[1.375rem] border border-border p-3 md:flex-col md:items-start lg:flex-row lg:items-center lg:p-4"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tile}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold">
                      {t(`benefits.${id}.title`)}
                    </h3>
                    <p className="text-xs leading-snug text-muted">
                      {t(`benefits.${id}.description`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <p
            lang="ar"
            dir="rtl"
            className="text-center font-arabic text-2xl leading-loose lg:text-left"
          >
            لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ
          </p>

          <div className="flex flex-col items-center gap-3 lg:items-start">
            <form action={signInWithGoogle} className="contents">
              <GoogleButton type="submit">{t("signIn")}</GoogleButton>
            </form>
            {authError && (
              <p
                role="alert"
                className="w-full max-w-md rounded-[1.375rem] border border-surface-line bg-surface px-4 py-3 text-center font-medium text-foreground lg:text-left"
              >
                {t("signInError")}
              </p>
            )}
            <p className="text-center text-sm text-muted lg:text-left">
              {t("signInNote")}
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted">
        {tFooter("text", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
