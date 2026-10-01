"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { OrderBoardCard } from "@/app/actions/orders";
import { updateOrderStatus } from "@/app/actions/orders";
import { OrderBoardCardView } from "@/components/pedidos/order-board-card";
import { OrdersBoardToolbar } from "@/components/pedidos/orders-board-toolbar";
import { Notice } from "@/components/ui/notice";
import {
  defaultOrderBoardFilters,
  filterAndSortOrders,
  groupOrdersByStatus,
  type OrderBoardFilters,
} from "@/lib/order-board-filter";
import { themeForStatus } from "@/lib/order-board-theme";
import { orderBoardColumns, type OrderStatus } from "@/lib/sale-labels";

export function OrdersKanban({ initialOrders }: { initialOrders: OrderBoardCard[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filters, setFilters] = useState<OrderBoardFilters>(defaultOrderBoardFilters);
  const [dragId, setDragId] = useState<string | null>(null);
  const [mobileColumn, setMobileColumn] = useState<OrderStatus>("pending");
  const [isDesktop, setIsDesktop] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const filtered = useMemo(
    () => filterAndSortOrders(orders, filters),
    [orders, filters]
  );

  const byColumn = useMemo(() => groupOrdersByStatus(filtered), [filtered]);

  const visibleColumns = useMemo(
    () =>
      filters.hideDone
        ? orderBoardColumns.filter((c) => c.value !== "delivered")
        : orderBoardColumns,
    [filters.hideDone]
  );

  // Si la columna elegida en móvil se oculta (p. ej. "Ocultar terminados"), cae a la primera visible.
  const activeMobileColumn: OrderStatus = visibleColumns.some((c) => c.value === mobileColumn)
    ? mobileColumn
    : (visibleColumns[0]?.value ?? "pending");

  const moveOrder = (saleId: string, status: OrderStatus) => {
    setError(null);
    const previous = orders;
    setOrders((list) =>
      list.map((o) => (o.id === saleId ? { ...o, order_status: status } : o))
    );
    if (!isDesktop) setMobileColumn(status);
    startTransition(async () => {
      const result = await updateOrderStatus(saleId, status);
      if (!result.ok) {
        setOrders(previous);
        setError(result.error);
      }
    });
  };

  const onDropColumn = (status: OrderStatus) => {
    if (!dragId) return;
    const order = orders.find((o) => o.id === dragId);
    if (!order || order.order_status === status) {
      setDragId(null);
      return;
    }
    moveOrder(dragId, status);
    setDragId(null);
  };

  const renderColumn = (column: (typeof orderBoardColumns)[number]) => {
    const theme = themeForStatus(column.value);
    const cards = byColumn[column.value];

    return (
      <section
        key={column.value}
        className={`flex-col rounded-[var(--radius)] border p-2.5 ${theme.columnBg} ${theme.columnBorder} ${
          !isDesktop && activeMobileColumn !== column.value ? "hidden md:flex" : "flex"
        } ${isDesktop ? "min-h-[22rem]" : "min-h-0"} ${
          dragId ? "ring-1 ring-inset ring-[var(--accent-ring)]" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDropColumn(column.value);
        }}
      >
        <header className="mb-2.5 flex items-center justify-between gap-2 px-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${theme.dot}`} aria-hidden />
            <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">{column.title}</h2>
            <span className="text-xs text-[var(--muted)]">· {column.subtitle}</span>
          </div>
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-[var(--ink-soft)]">
            {cards.length}
          </span>
        </header>

        <div className="flex flex-1 flex-col gap-2 rounded-[12px] bg-[var(--surface-muted)]/70 p-2">
          {cards.length === 0 ? (
            <p className="flex flex-1 items-center justify-center rounded-[10px] border border-dashed border-[var(--line-strong)] px-3 py-10 text-center text-xs text-[var(--muted)]">
              {isDesktop ? "Arrastra un pedido aquí" : "No hay pedidos en esta etapa"}
            </p>
          ) : (
            cards.map((order) => (
              <OrderBoardCardView
                key={order.id}
                order={order}
                onMove={moveOrder}
                dragging={dragId === order.id}
                onDragStart={setDragId}
                onDragEnd={() => setDragId(null)}
                enableDrag={isDesktop}
              />
            ))
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4 pb-6">
      <OrdersBoardToolbar
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        totalCount={orders.length}
      />

      {error && <Notice>{error}</Notice>}
      {pending && (
        <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--muted)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Guardando estado…
        </p>
      )}

      <div className="md:hidden">
        <div
          className="seg seg-fill"
          style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="Etapa del pedido"
        >
          {visibleColumns.map((col) => {
            const theme = themeForStatus(col.value);
            const active = activeMobileColumn === col.value;
            return (
              <button
                key={col.value}
                type="button"
                role="tab"
                aria-selected={active}
                data-on={active ? "true" : "false"}
                onClick={() => setMobileColumn(col.value)}
                className="seg-btn h-11 flex-col gap-0 px-1 leading-tight"
              >
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} aria-hidden />
                  <span className="text-[12px]">{col.title}</span>
                </span>
                <span className="font-mono text-[10px] font-semibold opacity-70">
                  {byColumn[col.value].length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">{visibleColumns.map(renderColumn)}</div>

      <p className="hidden text-center text-xs text-[var(--faint)] md:block">
        Arrastra entre columnas en escritorio. En móvil usa las pestañas y los botones de cada tarjeta.
      </p>
    </div>
  );
}
