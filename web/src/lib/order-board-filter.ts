import type { OrderBoardCard } from "@/app/actions/orders";
import type { OrderStatus, PaymentStatus } from "@/lib/sale-labels";

export type OrderSortKey =
  | "recent"
  | "delivery_soon"
  | "delivery_late"
  | "client"
  | "total_high"
  | "total_low";

export type DeliveryFilterKey =
  | "all"
  | "with_date"
  | "no_date"
  | "overdue"
  | "today"
  | "week";

export type PaymentFilterKey = "all" | PaymentStatus;

export type OrderBoardFilters = {
  query: string;
  sort: OrderSortKey;
  delivery: DeliveryFilterKey;
  payment: PaymentFilterKey;
  hideDone: boolean;
};

export const defaultOrderBoardFilters: OrderBoardFilters = {
  query: "",
  sort: "recent",
  delivery: "all",
  payment: "all",
  hideDone: false,
};

export function deliveryDateLocal(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(): Date {
  const d = startOfToday();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function deliveryUrgency(
  delivery_date: string | null,
  order_status: OrderStatus
): "none" | "overdue" | "today" | "soon" {
  if (!delivery_date || order_status === "delivered") return "none";
  const today = startOfToday();
  const delivery = deliveryDateLocal(delivery_date);
  const diffDays = Math.round((delivery.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "soon";
  return "none";
}

function matchesQuery(order: OrderBoardCard, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (order.customer_name.toLowerCase().includes(needle)) return true;
  return order.items.some(
    (item) =>
      item.productName.toLowerCase().includes(needle) ||
      item.variantLabel.toLowerCase().includes(needle)
  );
}

function matchesDelivery(order: OrderBoardCard, filter: DeliveryFilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "with_date") return Boolean(order.delivery_date);
  if (filter === "no_date") return !order.delivery_date;
  if (!order.delivery_date) return false;
  const delivery = deliveryDateLocal(order.delivery_date);
  const today = startOfToday();
  if (filter === "overdue") return delivery < today && order.order_status !== "delivered";
  if (filter === "today") return delivery.getTime() === today.getTime();
  if (filter === "week") {
    return delivery >= today && delivery <= endOfWeek();
  }
  return true;
}

function compareOrders(a: OrderBoardCard, b: OrderBoardCard, sort: OrderSortKey): number {
  switch (sort) {
    case "recent":
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    case "delivery_soon": {
      const ad = a.delivery_date ? deliveryDateLocal(a.delivery_date).getTime() : Infinity;
      const bd = b.delivery_date ? deliveryDateLocal(b.delivery_date).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    case "delivery_late": {
      const urgencyRank = (o: OrderBoardCard) => {
        const u = deliveryUrgency(o.delivery_date, o.order_status);
        if (u === "overdue") return 0;
        if (u === "today") return 1;
        if (u === "soon") return 2;
        return 3;
      };
      const diff = urgencyRank(a) - urgencyRank(b);
      if (diff !== 0) return diff;
      const ad = a.delivery_date ? deliveryDateLocal(a.delivery_date).getTime() : Infinity;
      const bd = b.delivery_date ? deliveryDateLocal(b.delivery_date).getTime() : Infinity;
      return ad - bd;
    }
    case "client":
      return a.customer_name.localeCompare(b.customer_name, "es");
    case "total_high":
      return b.total - a.total;
    case "total_low":
      return a.total - b.total;
    default:
      return 0;
  }
}

export function filterAndSortOrders(
  orders: OrderBoardCard[],
  filters: OrderBoardFilters
): OrderBoardCard[] {
  let list = orders.filter((order) => {
    if (filters.hideDone && order.order_status === "delivered") return false;
    if (filters.payment !== "all" && order.payment_status !== filters.payment) return false;
    if (!matchesDelivery(order, filters.delivery)) return false;
    return matchesQuery(order, filters.query);
  });

  list = [...list].sort((a, b) => compareOrders(a, b, filters.sort));
  return list;
}

export function groupOrdersByStatus(orders: OrderBoardCard[]): Record<OrderStatus, OrderBoardCard[]> {
  const map: Record<OrderStatus, OrderBoardCard[]> = {
    pending: [],
    ready: [],
    delivered: [],
  };
  for (const order of orders) {
    map[order.order_status].push(order);
  }
  return map;
}
