"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Minus, Package, Plus, SlidersHorizontal } from "lucide-react";
import {
  adjustProductStock,
  type StockMovementRow,
  type StockMovementType,
  type StockProductRow,
} from "@/app/actions/stock";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { SearchField } from "@/components/ui/search-field";
import { formatDateTime, formatMoney } from "@/lib/format";
import { stockMovementLabel } from "@/lib/stock-labels";

type Props = {
  initialProducts: StockProductRow[];
  initialMovements: StockMovementRow[];
};

const modeMeta: Record<
  StockMovementType,
  { label: string; hint: string; icon: typeof Plus; active: string }
> = {
  in: {
    label: "Entrada",
    hint: "Sumar unidades al inventario",
    icon: Plus,
    active: "bg-[var(--success)] text-white",
  },
  out: {
    label: "Salida",
    hint: "Restar unidades del inventario",
    icon: Minus,
    active: "bg-[var(--danger)] text-white",
  },
  adjustment: {
    label: "Ajustar",
    hint: "Fijar stock exacto (conteo físico)",
    icon: SlidersHorizontal,
    active: "bg-[var(--ink)] text-white",
  },
};

export function StockPanel({ initialProducts, initialMovements }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [movements, setMovements] = useState(initialMovements);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mode, setMode] = useState<StockMovementType>("in");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const lowCount = useMemo(() => products.filter((p) => p.isLow).length, [products]);

  const submit = (product: StockProductRow) => {
    setError(null);
    const raw = qty[product.id] ?? "";
    const amount = Number(String(raw).replace(/,/g, "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Indica una cantidad válida");
      return;
    }
    if (mode === "out" && amount > product.stock) {
      setError(`No hay suficiente stock (disponible: ${product.stock})`);
      return;
    }

    startTransition(async () => {
      const result = await adjustProductStock({
        productId: product.id,
        movementType: mode,
        quantity: mode === "adjustment" ? amount : Math.round(amount),
        note: note[product.id],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== product.id) return p;
          let nextStock = p.stock;
          if (mode === "in") nextStock += Math.round(amount);
          else if (mode === "out") nextStock -= Math.round(amount);
          else nextStock = Math.round(amount);
          return {
            ...p,
            stock: nextStock,
            isLow: nextStock <= p.min_stock,
          };
        })
      );

      setMovements((prev) => [
        {
          id: crypto.randomUUID(),
          product_id: product.id,
          movement_type: mode,
          quantity: Math.round(amount),
          notes: note[product.id]?.trim() || null,
          created_at: new Date().toISOString(),
          products: { name: product.name },
        },
        ...prev.slice(0, 39),
      ]);

      setQty((q) => ({ ...q, [product.id]: "" }));
      setNote((n) => ({ ...n, [product.id]: "" }));
      setExpanded(null);
    });
  };

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Sin productos con stock activo"
        description={
          <>
            Al crear o editar un producto, activa &quot;Controlar stock&quot; para verlo aquí.
          </>
        }
        action={
          <LinkButton href="/productos/nuevo" variant="secondary">
            Ir a productos
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="card card-pad space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar producto…" />
        <p className="text-[13px] text-[var(--muted)]">
          <span className="font-bold text-[var(--ink)]">{filtered.length}</span> producto(s) con
          inventario
          {lowCount > 0 && (
            <>
              {" "}
              ·{" "}
              <span className="inline-flex items-center gap-1 font-bold text-[var(--danger)]">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                {lowCount} con stock bajo
              </span>
            </>
          )}
        </p>
      </div>

      {error && <Notice>{error}</Notice>}

      <ul className="grid gap-2.5 md:grid-cols-2">
        {filtered.map((product) => {
          const open = expanded === product.id;
          const meta = modeMeta[mode];
          return (
            <li
              key={product.id}
              className={`card card-pad transition-shadow ${open ? "md:col-span-2 shadow-[var(--shadow-hover)]" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold tracking-tight text-[var(--ink)]">{product.name}</p>
                  <p className="text-xs text-[var(--muted)]">{formatMoney(product.unit_price)}</p>
                  {product.isLow && (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--danger-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--danger)]">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Stock bajo · mín. {product.min_stock}
                    </p>
                  )}
                </div>
                <p
                  className={`shrink-0 text-right font-mono text-[28px] font-bold leading-none tabular-nums ${
                    product.isLow ? "text-[var(--danger)]" : "text-[var(--ink)]"
                  }`}
                >
                  {product.stock}
                  <span className="ml-1 font-sans text-[11px] font-semibold text-[var(--muted)]">uds</span>
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {(Object.keys(modeMeta) as StockMovementType[]).map((m) => {
                  const Icon = modeMeta[m].icon;
                  const on = open && mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setExpanded(open && mode === m ? null : product.id);
                        setMode(m);
                      }}
                      aria-pressed={on}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-xs)] px-3 text-[13px] font-semibold transition-colors ${
                        on
                          ? modeMeta[m].active
                          : "bg-[var(--surface-muted)] text-[var(--ink-soft)] hover:bg-[var(--line)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {modeMeta[m].label}
                    </button>
                  );
                })}
                <Link
                  href={`/productos/${product.id}/editar`}
                  className="link ml-auto text-[13px]"
                >
                  Editar
                </Link>
              </div>

              {open && (
                <div className="mt-3 space-y-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-3 animate-fade">
                  <p className="text-xs font-bold text-[var(--ink-soft)]">{meta.hint}</p>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <input
                      inputMode="numeric"
                      value={qty[product.id] ?? ""}
                      onChange={(e) => setQty((q) => ({ ...q, [product.id]: e.target.value }))}
                      placeholder={mode === "adjustment" ? `Stock actual: ${product.stock}` : "Cantidad"}
                      aria-label="Cantidad"
                      className="field text-base font-bold tabular-nums"
                    />
                    <input
                      value={note[product.id] ?? ""}
                      onChange={(e) => setNote((n) => ({ ...n, [product.id]: e.target.value }))}
                      placeholder="Nota (opcional)"
                      aria-label="Nota"
                      className="field"
                    />
                    <Button type="button" disabled={pending} onClick={() => submit(product)}>
                      {pending ? "Guardando…" : "Confirmar"}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {movements.length > 0 && (
        <section className="card card-pad">
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">Movimientos recientes</h2>
          <ul className="mt-2 divide-y divide-[var(--line)]">
            {movements.map((m) => {
              const sign = m.movement_type === "out" ? "−" : m.movement_type === "in" ? "+" : "=";
              const color =
                m.movement_type === "out"
                  ? "text-[var(--danger)]"
                  : m.movement_type === "in"
                    ? "text-[var(--success)]"
                    : "text-[var(--ink)]";
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--ink)]">
                      {m.products?.name ?? "Producto"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {stockMovementLabel(m.movement_type)} · {formatDateTime(m.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 font-mono text-[15px] font-bold tabular-nums ${color}`}>
                    {sign}
                    {m.quantity}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
