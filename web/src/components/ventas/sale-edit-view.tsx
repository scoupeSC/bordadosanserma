"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { FileText, Plus, Save } from "lucide-react";
import type { ProductForSale, SaleForEdit } from "@/app/actions/sales";
import { updateSaleCheckout } from "@/app/actions/sales";
import { CartPanel } from "@/components/ventas/cart-panel";
import { DeleteSaleButton } from "@/components/ventas/delete-sale-button";
import { ProductPickSheet } from "@/components/ventas/product-pick-sheet";
import { ProductPickerModal } from "@/components/ventas/product-picker-modal";
import {
  SaleOrderMetaForm,
  type SaleOrderMetaFormHandle,
} from "@/components/ventas/sale-order-meta-form";
import { Button, LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatMoney } from "@/lib/format";
import type { SaleCheckoutInitial } from "@/lib/sale-checkout-initial";
import { buildCartLineKey, isDraftLineKey, isCartLineComplete, type CartLine } from "@/lib/sale-cart";

type Props = {
  sale: SaleForEdit;
  catalog: ProductForSale[];
};

function checkoutInitialFromSale(sale: SaleForEdit): SaleCheckoutInitial {
  return {
    customer: sale.customer,
    customerNameFallback: sale.customer ? null : sale.customer_name,
    paymentStatus: sale.payment_status,
    orderStatus: sale.order_status,
    amountPaid: sale.amount_paid,
    deliveryDate: sale.delivery_date,
  };
}

export function SaleEditView({ sale, catalog }: Props) {
  const router = useRouter();
  const metaRef = useRef<SaleOrderMetaFormHandle>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>(sale.cart);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickProduct, setPickProduct] = useState<ProductForSale | null>(null);

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

  const onPickFromList = (product: ProductForSale) => {
    setPickerOpen(false);
    setPickProduct(product);
  };

  const save = () => {
    setError(null);
    if (cart.length === 0) {
      setError("La venta debe tener al menos un producto");
      return;
    }
    if (cartIncomplete) {
      setError("Completa talla y color en cada línea");
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
      const result = await updateSaleCheckout(sale.id, {
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
      router.push("/ventas");
      router.refresh();
    });
  };

  return (
    <div className="pb-10 lg:grid lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-start lg:gap-6">
      <div className="space-y-4">
        <CartPanel
          cart={cart}
          catalog={catalog}
          title="Productos"
          showTotal={false}
          onUpdateQty={updateQty}
          onReplaceLine={replaceLine}
          onAddLine={addLine}
          onRemove={removeLine}
        />

        <Button type="button" variant="secondary" className="w-full" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" />
          Agregar producto
        </Button>

        <SaleOrderMetaForm
          ref={metaRef}
          initial={checkoutInitialFromSale(sale)}
          subtotal={subtotal}
        />
      </div>

      <aside className="mt-4 space-y-3 lg:sticky lg:top-6 lg:mt-0">
        <section className="card card-pad">
          <p className="eyebrow">Resumen</p>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-[var(--muted)]">Total</span>
            <span className="text-2xl font-bold tabular-nums tracking-tight text-[var(--ink)]">
              {formatMoney(subtotal)}
            </span>
          </div>

          {error && <Notice className="mt-4">{error}</Notice>}

          <Button
            type="button"
            size="lg"
            className="mt-4 w-full"
            disabled={pending || cart.length === 0 || cartIncomplete}
            onClick={save}
          >
            <Save className="h-4 w-4" aria-hidden />
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>

          <LinkButton href={`/ventas/${sale.id}/factura`} variant="secondary" className="mt-2 w-full">
            <FileText className="h-4 w-4" aria-hidden />
            Ver comprobante
          </LinkButton>
        </section>

        <div className="card p-3">
          <DeleteSaleButton saleId={sale.id} />
        </div>
      </aside>

      {pickerOpen && (
        <ProductPickerModal
          products={catalog}
          onSelect={onPickFromList}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {pickProduct && (
        <ProductPickSheet
          key={pickProduct.id}
          product={pickProduct}
          onClose={() => setPickProduct(null)}
          onAdd={(line) => {
            addLine(line);
            setPickProduct(null);
          }}
        />
      )}
    </div>
  );
}
