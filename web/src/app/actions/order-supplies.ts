"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import {
  aggregateSuppliesForItems,
  orderMaterialCost,
  orderNumberFromSaleId,
  type OrderSuppliesSummary,
} from "@/lib/order-supplies";
import { resolveSalesDateRange, type SalesDatePreset } from "@/lib/sales-period";
import { formatVariantLabel, type CartVariantOption } from "@/lib/sale-cart";

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

const saleSelectWithSupplies = `
  id,
  created_at,
  order_status,
  delivery_date,
  customer_name,
  total,
  customers ( name ),
  sale_items (
    quantity,
    products (
      name,
      product_supplies (
        name,
        quantity,
        unit_price
      )
    ),
    sale_item_options (
      option_id,
      attribute_options (
        id,
        label,
        attribute_groups ( name )
      )
    )
  )
`;

const saleSelectBase = `
  id,
  created_at,
  order_status,
  delivery_date,
  customer_name,
  total,
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
`;

function missingSuppliesSchema(message: string) {
  const m = message.toLowerCase();
  return m.includes("product_supplies") || m.includes("use_supplies") || m.includes("schema cache");
}

function mapSaleRow(row: {
  id: string;
  created_at: string;
  order_status: string;
  delivery_date: string | null;
  customer_name: string | null;
  total: number;
  customers: { name: string } | { name: string }[] | null;
  sale_items: {
    quantity: number;
    products: {
      name: string;
      product_supplies?: { name: string; quantity: number; unit_price: number | null }[] | null;
    } | {
      name: string;
      product_supplies?: { name: string; quantity: number; unit_price: number | null }[] | null;
    }[] | null;
    sale_item_options: OptionRow[] | null;
  }[];
}): OrderSuppliesSummary {
  const customerJoin = row.customers;
  const customerName =
    (Array.isArray(customerJoin) ? customerJoin[0]?.name : customerJoin?.name) ??
    row.customer_name ??
    "Sin cliente";

  const itemInputs = (row.sale_items ?? []).map((item) => {
    const product = first(item.products);
    const suppliesRaw = product?.product_supplies ?? [];
    const supplies = suppliesRaw.map((s) => ({
      name: s.name,
      quantity: Number(s.quantity),
      unit_price: s.unit_price != null ? Number(s.unit_price) : null,
    }));
    return {
      productName: product?.name ?? "Producto",
      variantLabel: variantLabelFromOptions(item.sale_item_options),
      quantity: item.quantity,
      supplies,
    };
  });

  const lines = aggregateSuppliesForItems(itemInputs);

  return {
    id: row.id,
    orderNumber: orderNumberFromSaleId(row.id),
    created_at: row.created_at,
    order_status: row.order_status as OrderSuppliesSummary["order_status"],
    delivery_date: row.delivery_date,
    customer_name: customerName,
    total: Number(row.total),
    lines,
    estimatedMaterialCost: orderMaterialCost(lines),
    hasSupplies: lines.length > 0,
  };
}

export type ListOrderSuppliesResult = {
  orders: OrderSuppliesSummary[];
  rangeLabel: string;
  suppliesSchemaReady: boolean;
};

export async function listOrderSupplies(input: {
  preset: SalesDatePreset;
  customFrom?: string;
  customTo?: string;
}): Promise<ListOrderSuppliesResult> {
  const range = resolveSalesDateRange(input.preset, input.customFrom, input.customTo);
  const supabase = createSupabaseServer();

  let result = await supabase
    .from("sales")
    .select(saleSelectWithSupplies)
    .eq("status", "completed")
    .gte("created_at", range.from)
    .lt("created_at", range.to)
    .order("created_at", { ascending: false })
    .limit(500);

  let suppliesSchemaReady = true;

  if (result.error && missingSuppliesSchema(result.error.message)) {
    suppliesSchemaReady = false;
    result = await supabase
      .from("sales")
      .select(saleSelectBase)
      .eq("status", "completed")
      .gte("created_at", range.from)
      .lt("created_at", range.to)
      .order("created_at", { ascending: false })
      .limit(500);
  }

  if (result.error) throw new Error(result.error.message);

  const orders = (result.data ?? []).map((row) =>
    mapSaleRow(row as Parameters<typeof mapSaleRow>[0])
  );

  return { orders, rangeLabel: range.label, suppliesSchemaReady };
}

export async function getOrderSupplies(saleId: string): Promise<OrderSuppliesSummary | null> {
  const supabase = createSupabaseServer();

  let result = await supabase
    .from("sales")
    .select(saleSelectWithSupplies)
    .eq("id", saleId)
    .eq("status", "completed")
    .maybeSingle();

  if (result.error && missingSuppliesSchema(result.error.message)) {
    result = await supabase
      .from("sales")
      .select(saleSelectBase)
      .eq("id", saleId)
      .eq("status", "completed")
      .maybeSingle();
  }

  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;

  return mapSaleRow(result.data as Parameters<typeof mapSaleRow>[0]);
}
