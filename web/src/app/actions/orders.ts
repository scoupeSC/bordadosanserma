"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatVariantLabel, type CartVariantOption } from "@/lib/sale-cart";
import type { OrderStatus, PaymentStatus } from "@/lib/sale-labels";

export type OrderLineDetail = {
  productName: string;
  quantity: number;
  variantLabel: string;
};

export type OrderBoardCard = {
  id: string;
  created_at: string;
  order_status: OrderStatus;
  delivery_date: string | null;
  customer_name: string;
  total: number;
  payment_status: PaymentStatus;
  items: OrderLineDetail[];
};

type OptionRow = {
  option_id?: string;
  attribute_options?: {
    id: string;
    label: string;
    attribute_groups?: { name: string } | { name: string }[] | null;
  } | {
    id: string;
    label: string;
    attribute_groups?: { name: string } | { name: string }[] | null;
  }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function variantLabelFromOptions(rows: OptionRow[] | null | undefined): string {
  const parts: CartVariantOption[] = [];
  for (const row of rows ?? []) {
    const opt = first(row.attribute_options);
    const optionId = opt?.id ?? row.option_id;
    if (!opt || !optionId) continue;
    const group = first(opt.attribute_groups);
    parts.push({
      optionId,
      label: opt.label,
      groupName: group?.name ?? "",
    });
  }
  parts.sort((a, b) => a.groupName.localeCompare(b.groupName, "es"));
  return formatVariantLabel(parts);
}

function mapSaleToBoardCard(row: {
  id: string;
  created_at: string;
  order_status: string;
  delivery_date: string | null;
  customer_name: string | null;
  total: number;
  payment_status: string;
  customers: { name: string } | { name: string }[] | null;
  sale_items: {
    quantity: number;
    products: { name: string } | { name: string }[] | null;
    sale_item_options: OptionRow[] | null;
  }[];
}): OrderBoardCard {
  const customerJoin = row.customers;
  const customerFromJoin = Array.isArray(customerJoin) ? customerJoin[0]?.name : customerJoin?.name;

  const items: OrderLineDetail[] = (row.sale_items ?? []).map((item) => {
    const product = first(item.products);
    return {
      productName: product?.name ?? "Producto",
      quantity: item.quantity,
      variantLabel: variantLabelFromOptions(item.sale_item_options),
    };
  });

  return {
    id: row.id,
    created_at: row.created_at,
    order_status: row.order_status as OrderStatus,
    delivery_date: row.delivery_date,
    customer_name: customerFromJoin ?? row.customer_name ?? "Sin cliente",
    total: Number(row.total),
    payment_status: row.payment_status as PaymentStatus,
    items,
  };
}

export async function listOrdersForBoard(): Promise<OrderBoardCard[]> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      created_at,
      order_status,
      delivery_date,
      customer_name,
      total,
      payment_status,
      customers ( name ),
      sale_items (
        quantity,
        products ( name ),
        sale_item_options (
          option_id,
          attribute_options (
            id,
            label,
            attribute_groups ( name )
          )
        )
      )
    `
    )
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapSaleToBoardCard(row as Parameters<typeof mapSaleToBoardCard>[0]));
}

export async function updateOrderStatus(saleId: string, orderStatus: OrderStatus) {
  if (!["pending", "ready", "delivered"].includes(orderStatus)) {
    return { ok: false as const, error: "Estado inválido" };
  }

  const supabase = createSupabaseServer();
  const { error } = await supabase
    .from("sales")
    .update({ order_status: orderStatus })
    .eq("id", saleId)
    .eq("status", "completed");

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/pedidos");
  revalidatePath("/ventas");
  return { ok: true as const };
}
