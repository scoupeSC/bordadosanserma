import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Volver",
  action,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <header className="mb-6 lg:mb-8">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex h-8 items-center gap-1.5 rounded-full pr-3 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-muted)]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          </span>
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface)] text-[var(--ink-soft)] ring-1 ring-[var(--line)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            )}
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          </div>
          <h1 className="mt-2 text-[26px] font-bold leading-[1.1] tracking-tight text-[var(--ink)] sm:text-3xl lg:text-[34px]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
        {action && (
          <div className="w-full shrink-0 sm:w-auto [&_a]:w-full sm:[&_a]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
