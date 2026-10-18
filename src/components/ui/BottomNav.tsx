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

export function BottomNav({
  items,
  activeHref,
  label = "Navigasi utama",
}: BottomNavProps) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] mx-auto max-w-md rounded-full border border-border bg-nav p-2 text-nav-foreground shadow-card"
    >
      <ul className="flex items-center justify-around">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`tap-target flex size-14 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nav-foreground ${
                  active ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {item.icon}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
