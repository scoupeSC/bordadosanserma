"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { ProductForSale } from "@/app/actions/sales";
import { ProductCatalogImage } from "@/components/productos/product-catalog-image";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { buildCartLineFromSelection, type CartLine } from "@/lib/sale-cart";

type Props = {
  product: ProductForSale;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
};

export function ProductPickSheet({ product, onClose, onAdd }: Props) {
  const [selected, setSelectedVariants] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  // El estado se reinicia por producto gracias a `key={product.id}` en el padre.

  const complete = useMemo(() => {
    if (product.variantGroups.length === 0) return true;
    return product.variantGroups.every((g) => selected[g.groupId]);
  }, [product, selected]);

  const pick = (groupId: string, optionId: string) => {
    setSelectedVariants((prev) => ({ ...prev, [groupId]: optionId }));
  };

  const handleAdd = () => {
    onAdd(buildCartLineFromSelection(product, selected, qty));
    onClose();
  };

  return (
    <Dialog onClose={onClose} size="md" labelledBy="pick-sheet-title">
      <div className="flex items-start gap-4 px-5 pt-4 sm:pt-5">
        <ProductCatalogImage
          name={product.name}
          imageUrl={product.image_url}
          className="h-20 w-20 shrink-0 rounded-[14px]"
          iconClassName="h-20 w-20 shrink-0 rounded-[14px]"
        />
        <div className="min-w-0 flex-1">
          <h2 id="pick-sheet-title" className="text-lg font-bold leading-snug tracking-tight text-[var(--ink)]">
            {product.name}
          </h2>
          <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-[var(--ink)]">
            {formatMoney(product.unit_price)}
          </p>
        </div>
        <button type="button" onClick={onClose} className="icon-btn -mr-1.5" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:pb-5">
        {product.variantGroups.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Sin variantes — solo elige cantidad.</p>
        ) : (
          <div className="space-y-4">
            {product.variantGroups.map((group) => (
              <div key={group.groupId}>
                <p className="eyebrow">{group.groupName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.options.map((opt) => {
                    const on = selected[group.groupId] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => pick(group.groupId, opt.id)}
                        aria-pressed={on}
                        className={`min-h-10 rounded-[10px] px-3.5 py-2 text-sm font-semibold transition-colors ${
                          on
                            ? "bg-[var(--ink)] text-white"
                            : "bg-[var(--surface-muted)] text-[var(--ink-soft)] hover:bg-[var(--line)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <span className="text-sm font-semibold text-[var(--muted)]">Cantidad</span>
          <div className="inline-flex h-11 items-center rounded-[11px] bg-[var(--surface-muted)]">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-full w-11 items-center justify-center rounded-l-[11px] text-[var(--ink-soft)] active:bg-[var(--line)]"
              aria-label="Menos"
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="min-w-[2.5rem] text-center font-mono text-lg font-bold tabular-nums text-[var(--ink)]">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="flex h-full w-11 items-center justify-center rounded-r-[11px] text-[var(--ink-soft)] active:bg-[var(--line)]"
              aria-label="Más"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <Button type="button" size="lg" className="mt-4 w-full" disabled={!complete} onClick={handleAdd}>
          Agregar · {formatMoney(product.unit_price * qty)}
        </Button>
        {!complete && (
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            Elige una opción en cada categoría para continuar.
          </p>
        )}
      </div>
    </Dialog>
  );
}
