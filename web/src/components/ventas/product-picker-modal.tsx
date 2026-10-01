"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ProductForSale } from "@/app/actions/sales";
import { ProductCatalogImage } from "@/components/productos/product-catalog-image";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { SearchField } from "@/components/ui/search-field";
import { formatMoney } from "@/lib/format";

type Props = {
  products: ProductForSale[];
  onSelect: (product: ProductForSale) => void;
  onClose: () => void;
};

export function ProductPickerModal({ products, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <Dialog onClose={onClose} size="md" labelledBy="pick-product-title" className="flex max-h-[85dvh] flex-col">
      <DialogHeader title="Elegir producto" id="pick-product-title" onClose={onClose} />
      <div className="px-5 pt-3">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar…" autoFocus size="sm" />
      </div>
      <ul className="flex-1 overflow-y-auto px-3 py-3">
        {filtered.length === 0 ? (
          <li className="px-2 py-8 text-center text-sm text-[var(--muted)]">Sin resultados</li>
        ) : (
          filtered.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelect(product)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left transition-colors hover:bg-[var(--surface-muted)] active:bg-[var(--line)]"
              >
                <ProductCatalogImage
                  name={product.name}
                  imageUrl={product.image_url}
                  className="h-11 w-11 shrink-0 rounded-[10px]"
                  iconClassName="h-11 w-11 shrink-0 rounded-[10px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">{product.name}</span>
                  <span className="block text-[13px] font-semibold tabular-nums text-[var(--muted)]">
                    {formatMoney(product.unit_price)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)]" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>
    </Dialog>
  );
}
