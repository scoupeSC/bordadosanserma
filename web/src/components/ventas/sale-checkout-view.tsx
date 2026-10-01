"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, Check } from "lucide-react";
import type { ProductForSale } from "@/app/actions/sales";
import { registerCheckout } from "@/app/actions/sales";
import { CartPanel } from "@/components/ventas/cart-panel";
import {
  SaleOrderMetaForm,
  type SaleOrderMetaFormHandle,
} from "@/components/ventas/sale-order-meta-form";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatMoney } from "@/lib/format";
import { isCartLineComplete, type CartLine } from "@/lib/sale-cart";
import type { SaleCheckoutInitial } from "@/lib/sale-checkout-initial";

type Props = {
  cart: CartLine[];
  catalog: ProductForSale[];
  checkoutInitial?: SaleCheckoutInitial;
  onBack: () => void;
  onUpdateQty: (lineKey: string, delta: number) => void;
  onReplaceLine: (oldLineKey: string, line: CartLine) => void;
  onAddLine: (line: CartLine) => void;
  onRemove: (lineKey: string) => void;
  onSuccess: (saleId: string) => void;
};

export function SaleCheckoutView({
  cart,
  catalog,
  checkoutInitial,
  onBack,
  onUpdateQty,
  onReplaceLine,
  onAddLine,
  onRemove,
  onSuccess,
}: Props) {
  const metaRef = useRef<SaleOrderMetaFormHandle>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(
    () => cart.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0),
    [cart]
  );

  const cartIncomplete = useMemo(
    () =>
      cart.some((line) => {
        const product = catalog.find((p) => p.id === line.productId) ?? null;
        return !isCartLineComplete(line, product);
      }),
    [cart, catalog]
  );

  const submit = () => {
    setError(null);
    if (cartIncomplete) {
      setError("Completa talla y color en cada producto del carrito");
      return;
    }
    const meta = metaRef.current;
    if (!meta) return;
    const metaError = meta.validate(subtotal);
    if (metaError) {
      setError(metaError);
      return;
    }
    const orderMeta = meta.getPayload();

    startTransition(async () => {
      const result = await registerCheckout({
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          optionIds: l.optionIds,
        })),
        ...orderMeta,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess(result.saleId);
    });
  };

  return (
    <div className="pb-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex h-8 items-center gap-1.5 rounded-full pr-3 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-muted)]">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        </span>
        Seguir agregando productos
      </button>

      <div className="lg:grid lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <CartPanel
            cart={cart}
            catalog={catalog}
            title="Tu pedido"
            onUpdateQty={onUpdateQty}
            onReplaceLine={onReplaceLine}
            onAddLine={onAddLine}
            onRemove={onRemove}
          />
          <SaleOrderMetaForm ref={metaRef} subtotal={subtotal} initial={checkoutInitial} />
        </div>

        <aside className="mt-4 space-y-3 lg:sticky lg:top-6 lg:mt-0">
          <section className="card card-pad">
            <p className="eyebrow">Resumen</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-[var(--muted)]">Total a cobrar</span>
              <span className="text-2xl font-bold tabular-nums tracking-tight text-[var(--ink)]">
                {formatMoney(subtotal)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {cart.reduce((n, l) => n + l.quantity, 0)} unidad(es) en {cart.length} línea(s)
            </p>

            {error && <Notice className="mt-4">{error}</Notice>}

            <Button
              type="button"
              size="lg"
              variant="accent"
              className="mt-4 w-full"
              disabled={pending || cart.length === 0 || cartIncomplete}
              onClick={submit}
            >
              <Check className="h-4 w-4" aria-hidden />
              {pending ? "Registrando…" : "Confirmar venta"}
            </Button>
            {cartIncomplete && (
              <p className="mt-2 text-center text-xs text-[var(--muted)]">
                Completa las variantes pendientes para confirmar.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
