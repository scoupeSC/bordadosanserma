"use client";

import { useMemo, useState } from "react";
import { ArrowRight, PackageSearch } from "lucide-react";
import type { ProductForSale } from "@/app/actions/sales";
import { ProductCatalogImage } from "@/components/productos/product-catalog-image";
import { CartPanel } from "@/components/ventas/cart-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { formatMoney } from "@/lib/format";
import type { CartLine } from "@/lib/sale-cart";

type Props = {
  products: ProductForSale[];
  cart: CartLine[];
  catalog: ProductForSale[];
  cartCount: number;
  cartTotal: number;
  onOpenProduct: (product: ProductForSale) => void;
  onGoCheckout: () => void;
  onUpdateQty: (lineKey: string, delta: number) => void;
  onReplaceLine: (oldLineKey: string, line: CartLine) => void;
  onAddLine: (line: CartLine) => void;
  onRemoveLine: (lineKey: string) => void;
};

export function SaleShopView({
  products,
  cart,
  catalog,
  cartCount,
  cartTotal,
  onOpenProduct,
  onGoCheckout,
  onUpdateQty,
  onReplaceLine,
  onAddLine,
  onRemoveLine,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const linesForProduct = (productId: string) => cart.filter((l) => l.productId === productId);

  return (
    <div className="pb-20 lg:pb-4">
      <div className="lg:grid lg:grid-cols-[1fr_min(22rem,100%)] lg:items-start lg:gap-6">
        <div className="min-w-0">
          <SearchField value={query} onChange={setQuery} placeholder="Buscar en catálogo…" />

          {filtered.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={PackageSearch}
                compact
                title={query ? "Sin resultados" : "No hay productos"}
                description={
                  query
                    ? "Prueba con otro nombre."
                    : "Crea algunos en el módulo Productos para empezar a vender."
                }
              />
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => {
                const inCart = linesForProduct(product.id);
                const qtyInCart = inCart.reduce((n, l) => n + l.quantity, 0);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => onOpenProduct(product)}
                      className={`card card-hover group relative flex h-full w-full flex-col overflow-hidden text-left transition-transform active:scale-[0.985] ${
                        qtyInCart > 0 ? "ring-2 ring-[var(--ink)] ring-offset-0" : ""
                      }`}
                    >
                      <ProductCatalogImage
                        name={product.name}
                        imageUrl={product.image_url}
                        className="aspect-[4/3] w-full rounded-none ring-0"
                        iconClassName="flex aspect-[4/3] w-full items-center justify-center rounded-none ring-0"
                      />
                      {qtyInCart > 0 && (
                        <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--ink)] px-2 font-mono text-xs font-bold text-white shadow-[var(--shadow-hover)]">
                          {qtyInCart}
                        </span>
                      )}
                      <div className="flex flex-1 flex-col p-3">
                        <span className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-[var(--ink)]">
                          {product.name}
                        </span>
                        <span className="mt-1 text-[15px] font-bold tabular-nums text-[var(--ink)]">
                          {formatMoney(product.unit_price)}
                        </span>
                        {qtyInCart > 0 ? (
                          <div className="mt-2 space-y-0.5">
                            {inCart.map((line) => (
                              <p key={line.lineKey} className="text-[11px] leading-snug text-[var(--muted)]">
                                <span className="font-bold tabular-nums text-[var(--ink)]">{line.quantity}×</span>{" "}
                                {line.variantLabel || "sin variantes"}
                              </p>
                            ))}
                          </div>
                        ) : product.variantGroups.length > 0 ? (
                          <span className="mt-1.5 line-clamp-1 text-[11px] text-[var(--muted)]">
                            {product.variantGroups.map((g) => g.groupName).join(" · ")}
                          </span>
                        ) : null}
                        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-[var(--accent)]">
                          {qtyInCart > 0 ? "Agregar otra" : "Elegir"}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 lg:sticky lg:top-6 lg:mt-0">
          <CartPanel
            cart={cart}
            catalog={catalog}
            compact
            onUpdateQty={onUpdateQty}
            onReplaceLine={onReplaceLine}
            onAddLine={onAddLine}
            onRemove={onRemoveLine}
          />
        </div>
      </div>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 px-3 pb-2 lg:hidden">
          <button
            type="button"
            onClick={onGoCheckout}
            className="flex w-full items-center justify-between rounded-[14px] bg-[var(--ink)] px-4 py-3 text-left text-white shadow-[var(--shadow-pop)] transition-transform active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/15 px-2 font-mono text-xs font-bold">
                {cartCount}
              </span>
              <span className="text-sm font-semibold">Ver carrito</span>
            </span>
            <span className="inline-flex items-center gap-2 text-base font-bold tabular-nums">
              {formatMoney(cartTotal)}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
