import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`card flex flex-col items-center px-6 text-center ${compact ? "py-8" : "py-12"}`}>
      {Icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--surface-muted)] text-[var(--ink-soft)]">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <p className={`${Icon ? "mt-3" : ""} text-[15px] font-bold text-[var(--ink)]`}>{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--muted)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
