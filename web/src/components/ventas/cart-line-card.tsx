"use client";

import { Minus, Plus, Trash2, X } from "lucide-react";
import type { ProductForSale } from "@/app/actions/sales";
import { formatMoney } from "@/lib/format";
import { isCartLineComplete, type CartLine } from "@/lib/sale-cart";

type Props = {
  line: CartLine;
  product: ProductForSale | null;
  compact?: boolean;
  onUpdateQty: (delta: number) => void;
  onPickVariant: (groupId: string, optionId: string) => void;
  onClearVariantGroup: (groupId: string) => void;
  onAddAnotherCombination: () => void;
  onRemove: () => void;
};

export function CartLineCard({
  line,
  product,
  compact = false,
  onUpdateQty,
  onPickVariant,
  onClearVariantGroup,
  onAddAnotherCombination,
  onRemove,
}: Props) {
  const groups = product?.variantGroups ?? [];
  const complete = isCartLineComplete(line, product);

  return (
    <article
      className={`rounded-[var(--radius-sm)] p-3 ${
        complete
          ? "bg-[var(--surface-muted)]"
          : "bg-[var(--danger-bg)]/50 ring-1 ring-inset ring-[var(--danger-line)]"
      }`}
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-bold leading-snug text-[var(--ink)]">{line.name}</p>
          {!complete && groups.length > 0 && (
            <p className="mt-0.5 text-xs font-semibold text-[var(--danger)]">
              Elige {groups.filter((g) => !line.optionIds.some((id) => g.options.some((o) => o.id === id))).map((g) => g.groupName.toLowerCase()).join(" y ")}
            </p>
          )}
          {complete && line.variantLabel && (
            <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">{line.variantLabel}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="icon-btn -mr-1 -mt-1 h-8 w-8 hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
          aria-label="Quitar del carrito"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {groups.length > 0 && (
        <div className={`space-y-2.5 ${compact ? "mt-2.5" : "mt-3"}`}>
          {groups.map((group) => {
            const selectedOpt = group.options.find((o) => line.optionIds.includes(o.id));
            return (
              <div key={group.groupId}>
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow text-[10px]">{group.groupName}</p>
                  {selectedOpt && (
                    <button
                      type="button"
                      onClick={() => onClearVariantGroup(group.groupId)}
                      className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      <X className="h-3 w-3" />
                      Quitar
                    </button>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.options.map((opt) => {
                    const on = line.optionIds.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onPickVariant(group.groupId, opt.id)}
                        title={on ? "Toca otra vez para quitar" : undefined}
                        className={`min-h-8 rounded-[8px] px-2.5 py-1 text-xs font-semibold transition-colors ${
                          on
                            ? "bg-[var(--ink)] text-white"
                            : "bg-[var(--surface)] text-[var(--ink-soft)] ring-1 ring-inset ring-[var(--line-strong)] hover:ring-[var(--ink)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="inline-flex h-10 items-center rounded-[10px] bg-[var(--surface)] ring-1 ring-inset ring-[var(--line-strong)]">
          <button
            type="button"
            onClick={() => onUpdateQty(-1)}
            className="flex h-full w-10 items-center justify-center rounded-l-[10px] text-[var(--ink-soft)] transition-colors active:bg-[var(--surface-muted)]"
            aria-label="Menos cantidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[2.25rem] text-center font-mono text-sm font-bold tabular-nums text-[var(--ink)]">
            {line.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(1)}
            className="flex h-full w-10 items-center justify-center rounded-r-[10px] text-[var(--ink-soft)] transition-colors active:bg-[var(--surface-muted)]"
            aria-label="Más cantidad"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <span className="text-[15px] font-bold tabular-nums text-[var(--ink)]">
          {formatMoney(line.unitPrice * line.quantity)}
        </span>
      </div>

      {groups.length > 0 && (
        <button
          type="button"
          onClick={onAddAnotherCombination}
          className="mt-2.5 w-full rounded-[8px] border border-dashed border-[var(--line-strong)] py-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          + Otra talla o color
        </button>
      )}
    </article>
  );
}
