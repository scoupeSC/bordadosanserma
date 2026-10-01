"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, Plus, X } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import {
  allNavItems,
  isActivePath,
  mobileTabHrefs,
  navGroups,
  navIcons,
} from "@/components/layout/nav-items";
import { NavLink } from "@/components/layout/nav-link";

export function Sidebar() {
  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-[var(--line)] bg-[var(--surface)] lg:flex">
      <div className="px-5 pb-4 pt-6">
        <Brand />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 no-scrollbar" aria-label="Menú principal">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="eyebrow mb-1.5 px-3">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} icon={item.icon}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--line)] p-4">
        <Link
          href="/ventas/nueva"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-ring)]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nueva venta
        </Link>
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  return (
    <header className="app-topbar sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/85 backdrop-blur-md lg:hidden">
      <div className="flex h-[var(--topbar-h)] items-center justify-between px-4">
        <Brand compact />
        <Link
          href="/ventas/nueva"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] pl-2.5 pr-3.5 text-[13px] font-semibold text-white transition-transform active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Venta
        </Link>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = mobileTabHrefs
    .map((href) => allNavItems.find((i) => i.href === href))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));
  const secondary = allNavItems.filter(
    (i) => !(mobileTabHrefs as readonly string[]).includes(i.href)
  );
  const moreActive = secondary.some((i) => isActivePath(pathname, i.href));

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-[var(--overlay)] animate-fade lg:hidden"
        />
      )}

      {moreOpen && (
        <div
          role="dialog"
          aria-label="Más módulos"
          className="fixed inset-x-0 z-40 px-3 animate-rise lg:hidden"
          style={{ bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 0.5rem)" }}
        >
          <div className="card p-3 shadow-[var(--shadow-pop)]">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="eyebrow">Más módulos</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="icon-btn h-8 w-8"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {secondary.map((item) => {
                const Icon = navIcons[item.icon];
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-3 text-center text-xs font-semibold transition-colors ${
                        active
                          ? "bg-[var(--ink)] text-white"
                          : "bg-[var(--surface-muted)] text-[var(--ink-soft)] active:bg-[var(--line)]"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <nav
        className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Navegación principal"
      >
        <ul className="grid h-[var(--tabbar-h)] grid-cols-5">
          {primary.map((item) => {
            const Icon = navIcons[item.icon];
            const active = isActivePath(pathname, item.href) && !moreOpen;
            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                    active ? "text-[var(--ink)]" : "text-[var(--muted)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className={`flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                moreOpen || moreActive ? "text-[var(--ink)]" : "text-[var(--muted)]"
              }`}
            >
              <span
                className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                  moreOpen || moreActive ? "bg-[var(--accent-soft)] text-[var(--accent)]" : ""
                }`}
              >
                <LayoutGrid className="h-5 w-5" strokeWidth={moreOpen || moreActive ? 2.4 : 2} aria-hidden />
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
