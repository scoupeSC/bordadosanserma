"use client";

import { Calendar, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import type { OrderBoardCard } from "@/app/actions/orders";
import { deliveryUrgency } from "@/lib/order-board-filter";
import { themeForStatus } from "@/lib/order-board-theme";
import { formatDateTime, formatDeliveryDate, formatMoney } from "@/lib/format";
import { orderBoardColumns, paymentLabel, type OrderStatus } from "@/lib/sale-labels";
import { Chip, paymentTone } from "@/components/ui/chip";

type Props = {
  order: OrderBoardCard;
  onMove: (saleId: string, status: OrderStatus) => void;
  dragging?: boolean;
  onDragStart: (saleId: string) => void;
  onDragEnd: () => void;
  enableDrag?: boolean;
};

export function OrderBoardCardView({
  order,
  onMove,
  dragging,
  onDragStart,
  onDragEnd,
  enableDrag = true,
}: Props) {
  const theme = themeForStatus(order.order_status);
  const colIndex = orderBoardColumns.findIndex((c) => c.value === order.order_status);
  const prev = colIndex > 0 ? orderBoardColumns[colIndex - 1] : null;
  const next = colIndex >= 0 && colIndex < orderBoardColumns.length - 1 ? orderBoardColumns[colIndex + 1] : null;
  const urgency = deliveryUrgency(order.delivery_date, order.order_status);

  const urgencyBadge =
    urgency === "overdue" ? (
      <Chip tone="danger" dot>Entrega atrasada</Chip>
    ) : urgency === "today" ? (
      <Chip tone="warn" dot>Entrega hoy</Chip>
    ) : urgency === "soon" ? (
      <Chip tone="info" dot>Entrega pronto</Chip>
    ) : null;

  return (
    <article
      draggable={enableDrag}
      onDragStart={() => enableDrag && onDragStart(order.id)}
      onDragEnd={onDragEnd}
      className={`group rounded-[var(--radius-sm)] border border-[var(--line)] p-3.5 transition-[box-shadow,opacity,transform] ${theme.cardBorder} ${theme.cardBg} ${
        dragging ? "opacity-50 ring-2 ring-[var(--accent)]" : "hover:shadow-[var(--shadow-hover)]"
      } ${enableDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-snug tracking-tight text-[var(--ink)]">
            {order.customer_name}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <span className="text-sm font-bold tabular-nums text-[var(--ink)]">{formatMoney(order.total)}</span>
          {enableDrag && (
            <GripVertical className="h-4 w-4 text-[var(--faint)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          )}
        </div>
      </div>

      {urgencyBadge && <div className="mt-2">{urgencyBadge}</div>}

      <ul className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-2.5">
        {order.items.map((item, i) => (
          <li key={i} className="text-xs leading-snug text-[var(--ink-soft)]">
            <span className="font-mono font-bold tabular-nums text-[var(--ink)]">{item.quantity}×</span>{" "}
            {item.productName}
            {item.variantLabel ? (
              <span className="block pl-5 text-[var(--muted)]">{item.variantLabel}</span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip tone={paymentTone(order.payment_status)}>{paymentLabel(order.payment_status)}</Chip>
        {order.delivery_date && (
          <Chip tone="muted">
            <Calendar className="h-3 w-3" aria-hidden />
            {formatDeliveryDate(order.delivery_date)}
          </Chip>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {prev ? (
          <button
            type="button"
            onClick={() => onMove(order.id, prev.value)}
            className="inline-flex min-h-10 items-center justify-center gap-0.5 rounded-[8px] bg-[var(--surface-muted)] px-2 text-xs font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--line)]"
          >
            <ChevronLeft className="h-4 w-4" />
            {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button
            type="button"
            onClick={() => onMove(order.id, next.value)}
            className={`inline-flex min-h-10 items-center justify-center gap-0.5 rounded-[8px] px-2 text-xs font-bold transition-[filter] hover:brightness-95 ${theme.moveNextBg} ${theme.moveNextText}`}
          >
            {next.title}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
