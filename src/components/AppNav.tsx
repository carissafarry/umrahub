import type { ComponentType } from "react";
import { getTranslations } from "next-intl/server";
import { BottomNav } from "@/components/ui/BottomNav";
import { HomeIcon, TripIcon } from "@/components/ui/icons";
import { AppNavLink } from "./AppNavLink";

type AppTab = {
  href: string;
  // Message key under Navigation.
  label: "home" | "trips";
  icon: ComponentType<{ className?: string }>;
};

// The app's tabs, shared by the mobile BottomNav and the desktop top nav.
// Only routes that exist belong here.
const appTabs = [
  { href: "/dashboard", label: "home", icon: HomeIcon },
  { href: "/trips", label: "trips", icon: TripIcon },
] as const satisfies readonly AppTab[];

// Mobile only (hidden from `lg` up). Pages that render it pad their content
// by at least `calc(7rem + env(safe-area-inset-bottom))` below `lg`.
export async function AppBottomNav({ activeHref }: { activeHref: string }) {
  const t = await getTranslations("Navigation");
  const [home, trips] = appTabs.map(({ href, label, icon: Icon }) => ({
    href,
    label: t(label),
    icon: <Icon className="size-6" />,
  }));

  return (
    <BottomNav
      items={[home, trips]}
      activeHref={activeHref}
      label={t("label")}
    />
  );
}

// Desktop only: text links with icons inside SiteHeader for signed-in users.
export async function AppTopNav({ className = "" }: { className?: string }) {
  const t = await getTranslations("Navigation");

  return (
    <nav aria-label={t("label")} className={`hidden lg:flex ${className}`}>
      <ul className="flex items-center gap-2">
        {appTabs.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <AppNavLink href={href}>
              <Icon className="size-5" />
              {t(label)}
            </AppNavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
