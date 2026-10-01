"use client";

import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  defaultOrderBoardFilters,
  type DeliveryFilterKey,
  type OrderBoardFilters,
  type OrderSortKey,
  type PaymentFilterKey,
} from "@/lib/order-board-filter";
import { paymentOptions } from "@/lib/sale-labels";
import { SearchField } from "@/components/ui/search-field";

type Props = {
  filters: OrderBoardFilters;
  onChange: (next: OrderBoardFilters) => void;
  resultCount: number;
  totalCount: number;
};

const sortOptions: { value: OrderSortKey; label: string }[] = [
  { value: "recent", label: "Más recientes" },
  { value: "delivery_soon", label: "Entrega más próxima" },
  { value: "delivery_late", label: "Urgentes / atrasados" },
  { value: "client", label: "Cliente A–Z" },
  { value: "total_high", label: "Mayor total" },
  { value: "total_low", label: "Menor total" },
];

const deliveryOptions: { value: DeliveryFilterKey; label: string }[] = [
  { value: "all", label: "Todas las entregas" },
  { value: "with_date", label: "Con fecha" },
  { value: "no_date", label: "Sin fecha" },
  { value: "overdue", label: "Atrasados" },
  { value: "today", label: "Entrega hoy" },
  { value: "week", label: "Esta semana" },
];

const selectClass = "field field-sm appearance-none bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236d7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:16px_16px] bg-[position:right_0.75rem_center] bg-no-repeat pr-9";

export function OrdersBoardToolbar({ filters, onChange, resultCount, totalCount }: Props) {
  const [open, setOpen] = useState(false);

  const set = (patch: Partial<OrderBoardFilters>) => onChange({ ...filters, ...patch });

  const activeFilterCount =
    (filters.query ? 1 : 0) +
    (filters.sort !== defaultOrderBoardFilters.sort ? 1 : 0) +
    (filters.delivery !== "all" ? 1 : 0) +
    (filters.payment !== "all" ? 1 : 0) +
    (filters.hideDone ? 1 : 0);

  const expanded = open || activeFilterCount > 0;

  return (
    <div className="card card-pad space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          value={filters.query}
          onChange={(v) => set({ query: v })}
          placeholder="Buscar cliente, producto, talla…"
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={expanded}
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-4 text-sm font-semibold transition-colors ${
            expanded
              ? "border-[var(--ink)] bg-[var(--ink)] text-white"
              : "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)]"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <p className="text-[13px] text-[var(--muted)]">
        Mostrando <span className="font-bold text-[var(--ink)]">{resultCount}</span> de {totalCount} pedidos
      </p>

      {expanded && (
        <div className="grid gap-3 border-t border-[var(--line)] pt-3 animate-fade sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label mb-1.5 text-xs text-[var(--muted)]">Ordenar</span>
            <select
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value as OrderSortKey })}
              className={selectClass}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label mb-1.5 text-xs text-[var(--muted)]">Entrega</span>
            <select
              value={filters.delivery}
              onChange={(e) => set({ delivery: e.target.value as DeliveryFilterKey })}
              className={selectClass}
            >
              {deliveryOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label mb-1.5 text-xs text-[var(--muted)]">Pago</span>
            <select
              value={filters.payment}
              onChange={(e) => set({ payment: e.target.value as PaymentFilterKey })}
              className={selectClass}
            >
              <option value="all">Todos</option>
              {paymentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col justify-end gap-2">
            <label className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] px-3 text-sm font-semibold text-[var(--ink)]">
              Ocultar terminados
              <input
                type="checkbox"
                checked={filters.hideDone}
                onChange={(e) => set({ hideDone: e.target.checked })}
                className="peer sr-only"
              />
              <span className="switch scale-90" aria-hidden />
            </label>
            <button
              type="button"
              onClick={() => onChange(defaultOrderBoardFilters)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
