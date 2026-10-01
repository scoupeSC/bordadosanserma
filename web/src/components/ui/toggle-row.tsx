"use client";

import type { LucideIcon } from "lucide-react";

export function ToggleRow({
  checked,
  onChange,
  title,
  description,
  icon: Icon,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border p-3.5 transition-colors ${
        checked
          ? "border-[var(--line-strong)] bg-[var(--surface)]"
          : "border-[var(--line)] bg-[var(--surface-muted)]/60"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {Icon && (
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
            checked ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface)] text-[var(--muted)]"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--ink)]">{title}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]">{description}</span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="switch" aria-hidden />
    </label>
  );
}
