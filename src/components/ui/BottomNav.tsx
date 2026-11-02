import Link from "next/link";
import type { ReactNode } from "react";

export type BottomNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

// One to four tabs only: a fifth item is a type error.
export type BottomNavItems =
  | readonly [BottomNavItem]
  | readonly [BottomNavItem, BottomNavItem]
  | readonly [BottomNavItem, BottomNavItem, BottomNavItem]
  | readonly [BottomNavItem, BottomNavItem, BottomNavItem, BottomNavItem];

type BottomNavProps = {
  items: BottomNavItems;
  activeHref: string;
  label?: string;
};

// Mobile only: hidden from `lg` up, where screens use a top nav instead.
export function BottomNav({
  items,
  activeHref,
  label = "Navigasi utama",
}: BottomNavProps) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] mx-auto max-w-md rounded-full border border-border bg-nav p-1.5 text-nav-foreground shadow-float lg:hidden"
    >
      <ul className="flex items-stretch gap-1">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`tap-target flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nav-foreground ${
                  active ? "bg-primary text-primary-foreground" : "text-muted"
                }`}
              >
                <span aria-hidden="true" className="flex">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
