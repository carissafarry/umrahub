"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A top-nav link that marks itself current on its route and the routes below
// it (Trip stays current on /trips/<id>). The highlight is a surface pill,
// not ink, so it never reads as a second primary CTA.
export function AppNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`tap-target inline-flex items-center gap-2 rounded-full px-5 font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? "bg-surface text-foreground shadow-card" : "text-muted"
      }`}
    >
      {children}
    </Link>
  );
}
