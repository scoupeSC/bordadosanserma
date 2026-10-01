"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getAttributeCatalog } from "@/app/actions/catalog";
import {
  parseVariantGroups,
  variantGroupsFromStoreCatalog,
  type ProductAttributeLink,
} from "@/lib/product-variants";
import { saleItemsToCartLines } from "@/lib/sale-from-db";
import type { CartLine } from "@/lib/sale-cart";
import type { OrderStatus, PaymentStatus } from "@/lib/sale-labels";
import type { CustomerRow } from "@/app/actions/customers";
import type { SalePaymentRow } from "@/app/actions/payments";
import { saleBalance } from "@/lib/sale-labels";
import { resolveSalesDateRange, type SalesDatePreset } from "@/lib/sales-period";

const PRODUCT_FOR_SALE_SELECT = `
  id,
  name,
  image_url,
  unit_price,
  product_attribute_options (
    option_id,
    attribute_options (
      id,
      label,
      group_id,
      attribute_groups ( id, name, display_order )
    )
  )
`;

export type ProductSearchHit = {
  id: string;
  name: string;
  unit_price: number;
};

export type ProductVariantGroup = {
  groupId: string;
  groupName: string;
  options: { id: string; label: string }[];
};

export type ProductForSale = {
  id: string;
  name: string;
  image_url: string | null;
  unit_price: number;
  variantGroups: ProductVariantGroup[];
};

export type SaleListRow = {
  id: string;
  total: number;
  amount_paid: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  delivery_date: string | null;
  customer_name: string | null;
  created_at: string;
  customers: { name: string } | null;
};

export type SaleInvoiceLine = {
  name: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SaleInvoiceData = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryDate: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  lines: SaleInvoiceLine[];
  payments: SalePaymentRow[];
};

export type SaleForEdit = {
  id: string;
  notes: string | null;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  amount_paid: number;
  delivery_date: string | null;
  customer_name: string | null;
  customer_id: string | null;
  customer: CustomerRow | null;
  cart: CartLine[];
};

type CheckoutPayload = {
  items: { productId: string; quantity: number; optionIds: string[] }[];
  customerId?: string | null;
  customerName?: string | null;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  amountPaid?: number;
  deliveryDate?: string | null;
  notes?: string;
};

function mapCheckoutItems(items: CheckoutPayload["items"]) {
  return items.map((i) => ({
    product_id: i.productId,
    quantity: i.quantity,
    option_ids: i.optionIds ?? [],
  }));
}

function mapProductForSale(
  row: {
    id: string;
    name: string;
    image_url?: string | null;
    unit_price: number;
    product_attribute_options?: ProductAttributeLink[] | null;
  },
  storeVariantGroups: ProductVariantGroup[]
): ProductForSale {
  const specific = parseVariantGroups(row.product_attribute_options);
  return {
    id: row.id,
    name: row.name,
    image_url: row.image_url ?? null,
    unit_price: Number(row.unit_price),
    variantGroups: specific.length > 0 ? specific : storeVariantGroups,
  };
}

const PRODUCT_FOR_SALE_SELECT_NO_IMAGE = `
  id,
  name,
  unit_price,
  product_attribute_options (
    option_id,
    attribute_options (
      id,
      label,
      group_id,
      attribute_groups ( id, name, display_order )
    )
  )
`;

export async function listCatalogProducts(): Promise<ProductForSale[]> {
  const supabase = createSupabaseServer();
  const catalog = await getAttributeCatalog();
  const first = await supabase
    .from("products")
    .select(PRODUCT_FOR_SALE_SELECT)
    .eq("is_active", true)
    .order("name", { ascending: true });

  type CatalogRow = Parameters<typeof mapProductForSale>[0];
  let rows: CatalogRow[] | null = (first.data ?? null) as CatalogRow[] | null;
  if (first.error) {
    const m = first.error.message.toLowerCase();
    if (m.includes("image_url")) {
      const fallback = await supabase
        .from("products")
        .select(PRODUCT_FOR_SALE_SELECT_NO_IMAGE)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (fallback.error) throw new Error(fallback.error.message);
      rows = (fallback.data ?? null) as CatalogRow[] | null;
    } else {
      throw new Error(first.error.message);
    }
  }

  const storeVariantGroups = variantGroupsFromStoreCatalog(catalog);
  return (rows ?? []).map((row) => mapProductForSale(row, storeVariantGroups));
}

export async function getProductForSale(productId: string): Promise<ProductForSale | null> {
  const supabase = createSupabaseServer();
  const catalog = await getAttributeCatalog();
  const first = await supabase
    .from("products")
    .select(PRODUCT_FOR_SALE_SELECT)
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();

  type CatalogRow = Parameters<typeof mapProductForSale>[0];
  let data = first.data as CatalogRow | null;
  if (first.error) {
    const m = first.error.message.toLowerCase();
    if (m.includes("image_url")) {
      const fallback = await supabase
        .from("products")
        .select(PRODUCT_FOR_SALE_SELECT_NO_IMAGE)
        .eq("id", productId)
        .eq("is_active", true)
        .maybeSingle();
      if (fallback.error) throw new Error(fallback.error.message);
      data = fallback.data as CatalogRow | null;
    } else {
      throw new Error(first.error.message);
    }
  }

  if (!data) return null;
  const storeVariantGroups = variantGroupsFromStoreCatalog(catalog);
  return mapProductForSale(data, storeVariantGroups);
}

export async function searchProductsForSale(query: string): Promise<ProductSearchHit[]> {
  const q = query.trim();
  const supabase = createSupabaseServer();

  let builder = supabase
    .from("products")
    .select("id, name, unit_price")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(15);

  if (q.length > 0) {
    const pattern = `%${q.replace(/%/g, "")}%`;
    builder = builder.ilike("name", pattern);
  }

  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    unit_price: Number(p.unit_price),
  }));
}

const SALE_LIST_SELECT = `id, total, amount_paid, payment_status, order_status, delivery_date,
       customer_name, created_at, customers ( name )`;

function mapSaleListRows(data: unknown[]): SaleListRow[] {
  return data.map((row) => {
    const r = row as SaleListRow;
    return {
      ...r,
      total: Number(r.total),
      amount_paid: Number(r.amount_paid ?? 0),
    };
  });
}

function saleCustomerLabel(sale: SaleListRow) {
  return sale.customers?.name ?? sale.customer_name ?? "";
}

export type ListSalesResult = {
  sales: SaleListRow[];
  rangeLabel: string;
  totalAmount: number;
};

export async function listSales(input: {
  preset: SalesDatePreset;
  customFrom?: string;
  customTo?: string;
  customerQuery?: string;
}): Promise<ListSalesResult> {
  const range = resolveSalesDateRange(input.preset, input.customFrom, input.customTo);
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_LIST_SELECT)
    .eq("status", "completed")
    .gte("created_at", range.from)
    .lt("created_at", range.to)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  let sales = mapSaleListRows(data ?? []);
  const q = input.customerQuery?.trim().toLowerCase();
  if (q) {
    sales = sales.filter((s) => saleCustomerLabel(s).toLowerCase().includes(q));
  }

  const totalAmount = sales.reduce((acc, s) => acc + Number(s.total), 0);
  return { sales, rangeLabel: range.label, totalAmount };
}

export async function listRecentSales(limit = 30): Promise<SaleListRow[]> {
  const { sales } = await listSales({ preset: "7d" });
  return sales.slice(0, limit);
}

function validateCheckoutInput(input: CheckoutPayload) {
  if (input.items.length === 0) {
    return "Agrega al menos un producto al pedido";
  }
  if (input.paymentStatus === "partial") {
    const abono = input.amountPaid ?? 0;
    if (!Number.isFinite(abono) || abono <= 0) {
      return "Indica cuánto abonó el cliente";
    }
  }
  return null;
}

function invoiceNumberFromId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export async function getSaleInvoice(saleId: string): Promise<SaleInvoiceData | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      created_at,
      subtotal,
      discount,
      total,
      amount_paid,
      payment_status,
      order_status,
      delivery_date,
      notes,
      customer_name,
      customers ( name, phone, email ),
      sale_items (
        id,
        product_id,
        quantity,
        unit_price,
        line_total,
        products ( name ),
        sale_item_options (
          option_id,
          attribute_options (
            id,
            label,
            attribute_groups ( name )
          )
        )
      ),
      sale_payments ( id, amount, note, created_at )
    `
    )
    .eq("id", saleId)
    .eq("status", "completed")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const customerJoin = data.customers as
    | { name: string; phone: string | null; email: string | null }
    | { name: string; phone: string | null; email: string | null }[]
    | null;
  const customer = Array.isArray(customerJoin) ? (customerJoin[0] ?? null) : customerJoin;

  const customerName =
    customer?.name ?? (data.customer_name as string | null) ?? "Cliente";
  const total = Number(data.total);
  const amountPaid = Number(data.amount_paid ?? 0);

  const items = (data.sale_items ?? []) as unknown as Parameters<typeof saleItemsToCartLines>[0];
  items.sort((a, b) => a.id.localeCompare(b.id));
  const cartLines = saleItemsToCartLines(items);

  const lines: SaleInvoiceLine[] = cartLines.map((line) => ({
    name: line.name,
    variantLabel: line.variantLabel,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: Math.round(line.unitPrice * line.quantity * 100) / 100,
  }));

  const payments = [...((data.sale_payments ?? []) as SalePaymentRow[])].map((p) => ({
    ...p,
    amount: Number(p.amount),
  }));
  payments.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return {
    id: data.id,
    invoiceNumber: invoiceNumberFromId(data.id),
    createdAt: data.created_at,
    customerName,
    customerPhone: customer?.phone ?? null,
    customerEmail: customer?.email ?? null,
    paymentStatus: data.payment_status as PaymentStatus,
    orderStatus: data.order_status as OrderStatus,
    deliveryDate: data.delivery_date,
    notes: data.notes,
    subtotal: Number(data.subtotal),
    discount: Number(data.discount ?? 0),
    total,
    amountPaid,
    balance: saleBalance(total, amountPaid),
    lines,
    payments,
  };
}

export async function getSaleForEdit(saleId: string): Promise<SaleForEdit | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      notes,
      payment_status,
      order_status,
      amount_paid,
      delivery_date,
      customer_id,
      customer_name,
      customers ( id, name, phone, email ),
      sale_items (
        id,
        product_id,
        quantity,
        unit_price,
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
    .eq("id", saleId)
    .eq("status", "completed")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const customerJoin = data.customers as CustomerRow | CustomerRow[] | null;
  const customer = Array.isArray(customerJoin) ? (customerJoin[0] ?? null) : customerJoin;

  const items = (data.sale_items ?? []) as unknown as Parameters<typeof saleItemsToCartLines>[0];
  items.sort((a, b) => a.id.localeCompare(b.id));

  return {
    id: data.id,
    notes: data.notes,
    payment_status: data.payment_status as PaymentStatus,
    order_status: data.order_status as OrderStatus,
    amount_paid: Number(data.amount_paid ?? 0),
    delivery_date: data.delivery_date,
    customer_name: data.customer_name,
    customer_id: data.customer_id,
    customer,
    cart: saleItemsToCartLines(items),
  };
}

export async function registerCheckout(input: CheckoutPayload) {
  const validationError = validateCheckoutInput(input);
  if (validationError) return { ok: false as const, error: validationError };

  const supabase = createSupabaseServer();
  const { data, error } = await supabase.rpc("register_checkout", {
    p_items: mapCheckoutItems(input.items),
    p_customer_id: input.customerId ?? null,
    p_customer_name: input.customerName?.trim() || null,
    p_payment_status: input.paymentStatus,
    p_order_status: input.orderStatus,
    p_amount_paid: input.paymentStatus === "partial" ? input.amountPaid : null,
    p_delivery_date: input.deliveryDate || null,
    p_discount: 0,
    p_notes: input.notes?.trim() || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/ventas");
  revalidatePath("/pedidos");
  revalidatePath(`/ventas/${data}/factura`);
  revalidatePath("/");
  return { ok: true as const, saleId: data as string };
}

export async function updateSaleCheckout(saleId: string, input: CheckoutPayload) {
  const validationError = validateCheckoutInput(input);
  if (validationError) return { ok: false as const, error: validationError };

  const supabase = createSupabaseServer();
  const { data, error } = await supabase.rpc("update_sale", {
    p_sale_id: saleId,
    p_items: mapCheckoutItems(input.items),
    p_customer_id: input.customerId ?? null,
    p_customer_name: input.customerName?.trim() || null,
    p_payment_status: input.paymentStatus,
    p_order_status: input.orderStatus,
    p_amount_paid: input.paymentStatus === "partial" ? input.amountPaid : null,
    p_delivery_date: input.deliveryDate || null,
    p_discount: 0,
    p_notes: input.notes?.trim() || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/ventas");
  revalidatePath("/pedidos");
  revalidatePath(`/ventas/${saleId}/editar`);
  revalidatePath(`/ventas/${saleId}/factura`);
  revalidatePath("/");
  return { ok: true as const, saleId: data as string };
}

export async function cancelSale(saleId: string) {
  const supabase = createSupabaseServer();
  const { error } = await supabase.rpc("cancel_sale", { p_sale_id: saleId });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/ventas");
  revalidatePath("/pedidos");
  revalidatePath("/");
  return { ok: true as const };
}
