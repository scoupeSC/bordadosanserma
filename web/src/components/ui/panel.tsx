import type { LucideIcon } from "lucide-react";

export function Panel({
  step,
  title,
  description,
  icon: Icon,
  children,
}: {
  step?: number;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4 sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        {step !== undefined ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--ink)] font-mono text-xs font-bold text-white">
            {step}
          </span>
        ) : Icon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[var(--ink-soft)]">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}
