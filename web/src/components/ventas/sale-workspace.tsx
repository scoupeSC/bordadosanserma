"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, ShoppingCart, Store } from "lucide-react";
import type { ProductForSale } from "@/app/actions/sales";
import type { SaleCheckoutInitial } from "@/lib/sale-checkout-initial";
import { ProductPickSheet } from "@/components/ventas/product-pick-sheet";
import { SaleCheckoutView } from "@/components/ventas/sale-checkout-view";
import { SaleShopView } from "@/components/ventas/sale-shop-view";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { buildCartLineKey, isDraftLineKey, type CartLine } from "@/lib/sale-cart";

type View = "shop" | "checkout";

export function SaleWorkspace({
  catalog,
  checkoutInitial,
}: {
  catalog: ProductForSale[];
  checkoutInitial?: SaleCheckoutInitial;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("shop");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickProduct, setPickProduct] = useState<ProductForSale | null>(null);

  const cartCount = useMemo(() => cart.reduce((n, l) => n + l.quantity, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0),
    [cart]
  );

  const addLine = (line: CartLine) => {
    setCart((prev) => {
      const signature = buildCartLineKey(line.productId, line.optionIds);
      const idx = prev.findIndex((l) => {
        if (isDraftLineKey(l.lineKey)) return false;
        return buildCartLineKey(l.productId, l.optionIds) === signature;
      });
      if (idx === -1) return [...prev, line];
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        ...line,
        lineKey: signature,
        quantity: next[idx].quantity + line.quantity,
      };
      return next;
    });
  };

  const updateQty = (lineKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.lineKey === lineKey ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (lineKey: string) => {
    setCart((prev) => prev.filter((l) => l.lineKey !== lineKey));
  };

  const replaceLine = (oldLineKey: string, line: CartLine) => {
    setCart((prev) => {
      if (oldLineKey === line.lineKey) {
        return prev.map((l) => (l.lineKey === oldLineKey ? line : l));
      }
      const rest = prev.filter((l) => l.lineKey !== oldLineKey);
      const idx = rest.findIndex((l) => l.lineKey === line.lineKey);
      if (idx === -1) return [...rest, line];
      const next = [...rest];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + line.quantity };
      return next;
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:mb-6">
        <div className="seg" role="tablist" aria-label="Paso de la venta">
          <button
            type="button"
            role="tab"
            aria-selected={view === "shop"}
            data-on={view === "shop" ? "true" : "false"}
            onClick={() => setView("shop")}
            className="seg-btn"
          >
            <Store className="h-4 w-4" aria-hidden />
            Catálogo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "checkout"}
            data-on={view === "checkout" ? "true" : "false"}
            onClick={() => setView("checkout")}
            disabled={cart.length === 0}
            className="seg-btn disabled:opacity-40"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            Carrito
            {cartCount > 0 && (
              <span className="ml-0.5 rounded-full bg-[var(--ink)] px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        {cartCount > 0 && view === "shop" && (
          <div className="hidden lg:block">
            <Button type="button" variant="accent" onClick={() => setView("checkout")}>
              Ir al carrito · {formatMoney(cartTotal)}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}
      </div>

      {view === "shop" ? (
        <SaleShopView
          products={catalog}
          cart={cart}
          catalog={catalog}
          cartCount={cartCount}
          cartTotal={cartTotal}
          onOpenProduct={setPickProduct}
          onGoCheckout={() => setView("checkout")}
          onUpdateQty={updateQty}
          onReplaceLine={replaceLine}
          onAddLine={addLine}
          onRemoveLine={removeLine}
        />
      ) : (
        <SaleCheckoutView
          cart={cart}
          catalog={catalog}
          checkoutInitial={checkoutInitial}
          onBack={() => setView("shop")}
          onUpdateQty={updateQty}
          onReplaceLine={replaceLine}
          onAddLine={addLine}
          onRemove={removeLine}
          onSuccess={(saleId) => {
            router.push(`/ventas/${saleId}/factura?nuevo=1`);
            router.refresh();
          }}
        />
      )}

      {pickProduct && (
        <ProductPickSheet
          key={pickProduct.id}
          product={pickProduct}
          onClose={() => setPickProduct(null)}
          onAdd={addLine}
        />
      )}
    </>
  );
}
