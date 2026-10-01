"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarRange, ChevronDown, ChevronUp, FlaskConical, Loader2, ShoppingBasket } from "lucide-react";
import {
  listOrderSupplies,
  type ListOrderSuppliesResult,
} from "@/app/actions/order-supplies";
import type { OrderSuppliesSummary } from "@/lib/order-supplies";
import { mergeOrderSupplyLines } from "@/lib/order-supplies";
import { Chip, orderTone } from "@/components/ui/chip";
import { DateRangeFields } from "@/components/ui/date-range-fields";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { formatDate, formatDeliveryDate, formatMoney } from "@/lib/format";
import { orderLabel } from "@/lib/sale-labels";
import { defaultCustomRangeKeys, type SalesDatePreset } from "@/lib/sales-period";

type StatusFilter = "all" | "pending" | "ready" | "delivered";

type InsumosDatePreset = Exclude<SalesDatePreset, "yesterday">;

const datePresets: { id: InsumosDatePreset; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "Semana" },
  { id: "month", label: "Mes" },
];

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "ready", label: "En proceso" },
  { value: "delivered", label: "Terminado" },
];

function formatQty(n: number) {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("es-CO", { maximumFractionDigits: 4 });
}

function orderMatchesQuery(order: OrderSuppliesSummary, q: string) {
  if (order.customer_name.toLowerCase().includes(q)) return true;
  if (order.orderNumber.toLowerCase().includes(q)) return true;
  if (order.id.toLowerCase().includes(q)) return true;
  if (order.lines.some((l) => l.name.toLowerCase().includes(q))) return true;
  return false;
}

export function OrderSuppliesModule({
  initial,
  initialPreset = "7d",
}: {
  initial: ListOrderSuppliesResult;
  initialPreset?: InsumosDatePreset;
}) {
  const defaults = defaultCustomRangeKeys();
  const [result, setResult] = useState(initial);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeDatePreset, setActiveDatePreset] = useState<InsumosDatePreset | "custom">(
    initialPreset
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(defaults.from);
  const [rangeTo, setRangeTo] = useState(defaults.to);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const skippedInitialFetch = useRef(false);

  const load = useCallback(
    (preset: SalesDatePreset, customFrom?: string, customTo?: string) => {
      startTransition(async () => {
        try {
          const next = await listOrderSupplies({ preset, customFrom, customTo });
          setResult(next);
          setRangeError(null);
          setExpanded(null);
        } catch (e) {
          setRangeError(e instanceof Error ? e.message : "No se pudo cargar pedidos");
        }
      });
    },
    []
  );

  useEffect(() => {
    if (activeDatePreset === "custom") return;
    if (
      !skippedInitialFetch.current &&
      activeDatePreset === initialPreset
    ) {
      skippedInitialFetch.current = true;
      return;
    }
    load(activeDatePreset);
  }, [activeDatePreset, initialPreset, load]);

  const filtered = useMemo(() => {
    let rows = result.orders;
    if (statusFilter !== "all") {
      rows = rows.filter((o) => o.order_status === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((o) => orderMatchesQuery(o, q));
    }
    return rows;
  }, [result.orders, statusFilter, query]);

  const ordersWithSupplies = useMemo(
    () => filtered.filter((o) => o.hasSupplies),
    [filtered]
  );

  const consolidated = useMemo(() => {
    return mergeOrderSupplyLines(ordersWithSupplies);
  }, [ordersWithSupplies]);

  const withSuppliesCount = ordersWithSupplies.length;

  const selectDatePreset = (id: InsumosDatePreset) => {
    setCustomOpen(false);
    setActiveDatePreset(id);
  };

  const applyCustomRange = () => {
    setRangeError(null);
    if (!rangeFrom || !rangeTo) {
      setRangeError("Elige la fecha inicial y la final");
      return;
    }
    if (rangeFrom > rangeTo) {
      setRangeError("La fecha inicial no puede ser después de la final");
      return;
    }
    setActiveDatePreset("custom");
    load("custom", rangeFrom, rangeTo);
  };

  if (!result.suppliesSchemaReady) {
    return (
      <Notice>
        <p className="font-bold">Insumos no disponibles en la base de datos</p>
        <p className="mt-1">
          Ejecuta <code className="rounded bg-white/70 px-1 font-mono text-[12px]">npm run db:migrate</code>{" "}
          en la carpeta HADER (migración 012) y recarga el esquema en Supabase si hace falta.
        </p>
      </Notice>
    );
  }

  const showCustom = customOpen || activeDatePreset === "custom";
  type DateSeg = InsumosDatePreset | "custom";
  const segValue: DateSeg = showCustom ? "custom" : activeDatePreset;

  return (
    <div className="space-y-4">
      <div className="card card-pad space-y-3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Buscar por cliente, N.º de pedido o insumo…"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="label mb-1.5 text-xs text-[var(--muted)]">Fecha del pedido</p>
            <Segmented<DateSeg>
              value={segValue}
              onChange={(v) => {
                if (v === "custom") {
                  setCustomOpen(true);
                  return;
                }
                selectDatePreset(v);
              }}
              options={[
                ...datePresets.map((p) => ({ value: p.id, label: p.label })),
                { value: "custom", label: "Rango" },
              ]}
              fill
              ariaLabel="Fecha del pedido"
            />
          </div>
          <div>
            <p className="label mb-1.5 text-xs text-[var(--muted)]">Estado del pedido</p>
            <Segmented<StatusFilter>
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              fill
              ariaLabel="Estado del pedido"
            />
          </div>
        </div>

        {showCustom && (
          <DateRangeFields
            from={rangeFrom}
            to={rangeTo}
            onFromChange={setRangeFrom}
            onToChange={setRangeTo}
            onApply={applyCustomRange}
            active={activeDatePreset === "custom"}
            pending={pending}
            error={rangeError}
          />
        )}

        {(rangeError || result.rangeLabel) && (
          <p className="flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-3 text-[13px] text-[var(--muted)]">
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            {rangeError && !showCustom ? (
              <span className="font-medium text-[var(--danger)]">{rangeError}</span>
            ) : (
              <>
                <span className="font-semibold text-[var(--ink)]">{result.rangeLabel}</span>
                <span aria-hidden>·</span>
                <span>
                  <span className="font-bold text-[var(--ink)]">{filtered.length}</span> pedido(s)
                </span>
                <span aria-hidden>·</span>
                <span>{withSuppliesCount} con insumos</span>
              </>
            )}
          </p>
        )}
      </div>

      <ConsolidatedTable
        lines={consolidated}
        orderCount={withSuppliesCount}
        materialCount={consolidated.length}
      />

      <section>
        <h2 className="mb-3 text-[15px] font-bold tracking-tight text-[var(--ink)]">Detalle por pedido</h2>
        <OrderList orders={filtered} expanded={expanded} setExpanded={setExpanded} />
      </section>
    </div>
  );
}

function ConsolidatedTable({
  lines,
  orderCount,
  materialCount,
}: {
  lines: OrderSuppliesSummary["lines"];
  orderCount: number;
  materialCount: number;
}) {
  const header = (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ink)] text-white">
        <ShoppingBasket className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">Materiales totales</h2>
          {orderCount > 0 && lines.length > 0 && (
            <p className="text-xs text-[var(--muted)]">
              {materialCount} insumo(s) · {orderCount} pedido(s)
            </p>
          )}
        </div>
        <p className="text-[13px] text-[var(--muted)]">
          Suma de cantidades según fecha, estado y búsqueda activos (lista de compra).
        </p>
      </div>
    </div>
  );

  if (orderCount === 0) {
    return (
      <section className="card card-pad">
        {header}
        <p className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-[var(--line-strong)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          No hay pedidos con insumos con los filtros actuales (fecha, estado o búsqueda).
        </p>
      </section>
    );
  }
  if (lines.length === 0) {
    return (
      <section className="card card-pad">
        {header}
        <p className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-[var(--line-strong)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          Los productos de estos pedidos no tienen insumos definidos. Configúralos en Productos →
          Registrar insumos.
        </p>
      </section>
    );
  }

  const totalCost = lines.reduce((acc, l) => acc + (l.estimatedCost ?? 0), 0);
  const hasCost = lines.some((l) => l.estimatedCost != null);

  return (
    <section className="card card-pad">
      {header}
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="table-head border-b border-[var(--line)] text-left">
            <th className="pb-2">Insumo</th>
            <th className="px-2 pb-2 text-right">Cantidad</th>
            <th className="pb-2 text-right">Costo est.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {lines.map((line) => (
            <tr key={line.name}>
              <td className="py-3 pr-2 font-semibold text-[var(--ink)]">{line.name}</td>
              <td className="whitespace-nowrap px-2 py-3 text-right font-mono text-[15px] font-bold tabular-nums text-[var(--ink)]">
                {formatQty(line.totalQuantity)}
              </td>
              <td className="whitespace-nowrap py-3 text-right tabular-nums text-[var(--ink-soft)]">
                {line.estimatedCost != null ? formatMoney(line.estimatedCost) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasCost && (
        <div className="mt-3 flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--surface-muted)] px-4 py-3">
          <span className="text-[13px] font-semibold text-[var(--muted)]">Costo estimado total</span>
          <span className="text-base font-bold tabular-nums text-[var(--ink)]">{formatMoney(totalCost)}</span>
        </div>
      )}
    </section>
  );
}

function OrderList({
  orders,
  expanded,
  setExpanded,
}: {
  orders: OrderSuppliesSummary[];
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        compact
        icon={FlaskConical}
        title="No hay pedidos en este periodo o filtro"
        description="Prueba ampliar el rango de fechas."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => {
        const open = expanded === order.id;
        return (
          <li key={order.id} className="card card-pad">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-bold tracking-tight text-[var(--ink)]">{order.customer_name}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  <span className="font-mono">#{order.orderNumber}</span> · {formatDate(order.created_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip tone={orderTone(order.order_status)} dot>
                    {orderLabel(order.order_status)}
                  </Chip>
                  {order.delivery_date && (
                    <Chip tone="muted">Entrega {formatDeliveryDate(order.delivery_date)}</Chip>
                  )}
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="text-base font-bold tabular-nums text-[var(--ink)]">
                  {formatMoney(order.total)}
                </p>
                {order.hasSupplies ? (
                  <p className="text-xs text-[var(--muted)]">
                    {order.lines.length} insumo(s)
                    {order.estimatedMaterialCost != null && (
                      <> · Mat. {formatMoney(order.estimatedMaterialCost)}</>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--muted)]">Sin insumos en productos</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
              {order.hasSupplies && (
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : order.id)}
                  aria-expanded={open}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-xs)] px-3 text-[13px] font-bold transition-colors ${
                    open
                      ? "bg-[var(--ink)] text-white"
                      : "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95"
                  }`}
                >
                  <FlaskConical className="h-4 w-4" />
                  Ver materiales
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
              <Link
                href="/pedidos"
                className="inline-flex h-9 items-center rounded-[var(--radius-xs)] border border-[var(--line-strong)] px-3 text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                Tablero pedidos
              </Link>
              <Link href={`/ventas/${order.id}/editar`} className="link ml-auto text-[13px]">
                Ver venta
              </Link>
            </div>

            {open && order.hasSupplies && (
              <div className="mt-3 space-y-2 animate-fade">
                {order.lines.map((line) => (
                  <div key={line.name} className="rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-[var(--ink)]">{line.name}</p>
                      <p className="text-sm font-bold tabular-nums text-[var(--ink)]">
                        <span className="font-mono">{formatQty(line.totalQuantity)}</span> uds
                        {line.estimatedCost != null && (
                          <span className="ml-2 font-normal text-[var(--muted)]">
                            · {formatMoney(line.estimatedCost)}
                          </span>
                        )}
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                      {line.breakdown.map((b, i) => (
                        <li key={i}>
                          {b.productName}
                          {b.variantLabel ? ` · ${b.variantLabel}` : ""} — {b.itemQuantity}×
                          producto × {formatQty(b.supplyPerUnit)} ={" "}
                          <span className="font-semibold text-[var(--ink-soft)]">
                            {formatQty(b.lineTotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
