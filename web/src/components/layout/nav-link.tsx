"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, navIcons, type NavIconKey } from "@/components/layout/nav-items";

export type { NavIconKey } from "@/components/layout/nav-items";

export function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: NavIconKey;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  const Icon = navIcons[icon];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
        active
          ? "bg-[var(--ink)] text-white"
          : "text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${
          active ? "text-white" : "text-[var(--muted)] group-hover:text-[var(--ink)]"
        }`}
        strokeWidth={active ? 2.25 : 2}
        aria-hidden
      />
      <span className="truncate">{children}</span>
    </Link>
  );
}
