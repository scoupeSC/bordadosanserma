"use client";

import { ShoppingCart } from "lucide-react";
import type { ProductForSale } from "@/app/actions/sales";
import { CartLineCard } from "@/components/ventas/cart-line-card";
import { formatMoney } from "@/lib/format";
import {
  buildCartLineFromSelection,
  createEmptyVariantLine,
  isCartLineComplete,
  selectedVariantsFromLine,
  type CartLine,
} from "@/lib/sale-cart";

type Props = {
  cart: CartLine[];
  catalog: ProductForSale[];
  title?: string;
  compact?: boolean;
  showTotal?: boolean;
  onUpdateQty: (lineKey: string, delta: number) => void;
  onReplaceLine: (oldLineKey: string, line: CartLine) => void;
  onAddLine: (line: CartLine) => void;
  onRemove: (lineKey: string) => void;
};

export function CartPanel({
  cart,
  catalog,
  title = "Carrito",
  compact = false,
  showTotal = true,
  onUpdateQty,
  onReplaceLine,
  onAddLine,
  onRemove,
}: Props) {
  const subtotal = cart.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  const count = cart.reduce((n, l) => n + l.quantity, 0);

  const productFor = (productId: string) => catalog.find((p) => p.id === productId) ?? null;

  const pickVariant = (line: CartLine, groupId: string, optionId: string) => {
    const product = productFor(line.productId);
    if (!product) return;
    const selected = { ...selectedVariantsFromLine(line, product) };
    if (selected[groupId] === optionId) {
      delete selected[groupId];
    } else {
      selected[groupId] = optionId;
    }
    const next = buildCartLineFromSelection(product, selected, line.quantity, {
      previousLineKey: line.lineKey,
    });
    onReplaceLine(line.lineKey, next);
  };

  const clearVariantGroup = (line: CartLine, groupId: string) => {
    const product = productFor(line.productId);
    if (!product) return;
    const selected = { ...selectedVariantsFromLine(line, product) };
    delete selected[groupId];
    const next = buildCartLineFromSelection(product, selected, line.quantity, {
      previousLineKey: line.lineKey,
    });
    onReplaceLine(line.lineKey, next);
  };

  const addAnotherCombination = (line: CartLine) => {
    const product = productFor(line.productId);
    if (!product) return;
    onAddLine(createEmptyVariantLine(product, 1));
  };

  const hasIncomplete = cart.some((line) => !isCartLineComplete(line, productFor(line.productId)));

  if (cart.length === 0) {
    return (
      <section className="card card-pad">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-[var(--muted)]" aria-hidden />
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">{title}</h2>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">Aún no hay productos. Toca uno del catálogo para empezar.</p>
      </section>
    );
  }

  return (
    <section className="card card-pad">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">{title}</h2>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {count} {count === 1 ? "unidad" : "unidades"}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {cart.map((line) => (
          <li key={line.lineKey}>
            <CartLineCard
              line={line}
              product={productFor(line.productId)}
              compact={compact}
              onUpdateQty={(delta) => onUpdateQty(line.lineKey, delta)}
              onPickVariant={(groupId, optionId) => pickVariant(line, groupId, optionId)}
              onClearVariantGroup={(groupId) => clearVariantGroup(line, groupId)}
              onAddAnotherCombination={() => addAnotherCombination(line)}
              onRemove={() => onRemove(line.lineKey)}
            />
          </li>
        ))}
      </ul>
      {hasIncomplete && (
        <p className="mt-3 text-xs font-medium text-[var(--danger)]">
          Completa talla y color en las líneas marcadas antes de cobrar.
        </p>
      )}
      {showTotal && (
        <div className="mt-4 flex items-baseline justify-between border-t border-[var(--line)] pt-3.5">
          <span className="text-sm font-semibold text-[var(--muted)]">Subtotal</span>
          <span className="text-lg font-bold tabular-nums tracking-tight text-[var(--ink)]">{formatMoney(subtotal)}</span>
        </div>
      )}
    </section>
  );
}
