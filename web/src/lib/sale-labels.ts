export type PaymentStatus = "paid" | "credit" | "partial";
export type OrderStatus = "pending" | "ready" | "delivered";

export const paymentOptions: { value: PaymentStatus; label: string; hint: string }[] = [
  { value: "paid", label: "Pagado", hint: "Cobraste el total" },
  { value: "partial", label: "Abonado", hint: "Pagó una parte; indica cuánto" },
  { value: "credit", label: "Fiado", hint: "Nada pagado aún" },
];

export const orderOptions: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "ready", label: "En proceso" },
  { value: "delivered", label: "Terminado" },
];

export const orderBoardColumns: { value: OrderStatus; title: string; subtitle: string }[] = [
  { value: "pending", title: "Pendiente", subtitle: "Por iniciar" },
  { value: "ready", title: "En proceso", subtitle: "En taller" },
  { value: "delivered", title: "Terminado", subtitle: "Listo o entregado" },
];

export function paymentLabel(status: PaymentStatus) {
  return paymentOptions.find((o) => o.value === status)?.label ?? status;
}

export function orderLabel(status: OrderStatus) {
  return orderOptions.find((o) => o.value === status)?.label ?? status;
}

export function saleBalance(total: number, amountPaid: number) {
  return Math.max(total - amountPaid, 0);
}
