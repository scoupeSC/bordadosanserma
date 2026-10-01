import type { CustomerRow } from "@/app/actions/customers";
import type { OrderStatus, PaymentStatus } from "@/lib/sale-labels";

export type SaleCheckoutInitial = {
  customer: CustomerRow | null;
  customerNameFallback: string | null;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  amountPaid: number;
  deliveryDate: string | null;
};
