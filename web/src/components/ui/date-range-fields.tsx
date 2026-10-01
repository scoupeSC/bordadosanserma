"use client";

import { Button } from "@/components/ui/button";

export function DateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
  active,
  pending,
  error,
  applyLabel = "Aplicar",
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  active: boolean;
  pending?: boolean;
  error?: string | null;
  applyLabel?: string;
}) {
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="label mb-1.5 text-xs text-[var(--muted)]">Desde</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onFromChange(e.target.value)}
            className="field field-sm"
          />
        </label>
        <label className="block">
          <span className="label mb-1.5 text-xs text-[var(--muted)]">Hasta</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onToChange(e.target.value)}
            className="field field-sm"
          />
        </label>
        <Button
          type="button"
          size="sm"
          className="h-10 w-full sm:w-auto"
          variant={active ? "primary" : "secondary"}
          disabled={pending}
          onClick={onApply}
        >
          {applyLabel}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-[var(--danger)]">{error}</p>}
    </div>
  );
}
