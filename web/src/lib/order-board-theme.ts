import type { OrderStatus } from "@/lib/sale-labels";

export const orderStatusTheme: Record<
  OrderStatus,
  {
    columnBg: string;
    columnBorder: string;
    columnTitle: string;
    dot: string;
    cardBorder: string;
    cardBg: string;
    chipBg: string;
    chipText: string;
    moveNextBg: string;
    moveNextText: string;
  }
> = {
  pending: {
    columnBg: "bg-[var(--surface)]",
    columnBorder: "border-[var(--line)]",
    columnTitle: "text-[var(--order-pending)]",
    dot: "bg-[var(--order-pending)]",
    cardBorder: "border-l-[3px] border-l-[var(--order-pending)]",
    cardBg: "bg-[var(--surface)]",
    chipBg: "bg-[var(--order-pending-bg)]",
    chipText: "text-[var(--order-pending)]",
    moveNextBg: "bg-[var(--order-process-bg)]",
    moveNextText: "text-[var(--order-process)]",
  },
  ready: {
    columnBg: "bg-[var(--surface)]",
    columnBorder: "border-[var(--line)]",
    columnTitle: "text-[var(--order-process)]",
    dot: "bg-[var(--order-process)]",
    cardBorder: "border-l-[3px] border-l-[var(--order-process)]",
    cardBg: "bg-[var(--surface)]",
    chipBg: "bg-[var(--order-process-bg)]",
    chipText: "text-[var(--order-process)]",
    moveNextBg: "bg-[var(--order-done-bg)]",
    moveNextText: "text-[var(--order-done)]",
  },
  delivered: {
    columnBg: "bg-[var(--surface)]",
    columnBorder: "border-[var(--line)]",
    columnTitle: "text-[var(--order-done)]",
    dot: "bg-[var(--order-done)]",
    cardBorder: "border-l-[3px] border-l-[var(--order-done)]",
    cardBg: "bg-[var(--surface)]",
    chipBg: "bg-[var(--order-done-bg)]",
    chipText: "text-[var(--order-done)]",
    moveNextBg: "bg-[var(--surface-muted)]",
    moveNextText: "text-[var(--muted)]",
  },
};

export function themeForStatus(status: OrderStatus) {
  return orderStatusTheme[status];
}
