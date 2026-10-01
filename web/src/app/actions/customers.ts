"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { SalePaymentRow } from "@/app/actions/payments";
import { saleBalance, type OrderStatus, type PaymentStatus } from "@/lib/sale-labels";

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at?: string;
};

export type CustomerListRow = CustomerRow & {
  salesCount: number;
  totalPurchased: number;
  balanceDue: number;
};

export type CustomerSaleSummary = {
  id: string;
  created_at: string;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  delivery_date: string | null;
  payments: SalePaymentRow[];
};

export type CustomerDetail = {
  customer: CustomerRow & { created_at: string };
  stats: {
    salesCount: number;
    totalPurchased: number;
    totalPaid: number;
    balanceDue: number;
  };
  sales: CustomerSaleSummary[];
};

type SaleAggRow = {
  customer_id: string | null;
  total: number;
  amount_paid: number | null;
};

function aggregateSalesByCustomer(sales: SaleAggRow[]) {
  const map = new Map<string, { salesCount: number; totalPurchased: number; balanceDue: number }>();
  for (const row of sales) {
    const cid = row.customer_id;
    if (!cid) continue;
    const total = Number(row.total);
    const paid = Number(row.amount_paid ?? 0);
    const balance = saleBalance(total, paid);
    const existing = map.get(cid);
    if (!existing) {
      map.set(cid, {
        salesCount: 1,
        totalPurchased: total,
        balanceDue: balance,
      });
    } else {
      existing.salesCount += 1;
      existing.totalPurchased += total;
      existing.balanceDue += balance;
    }
  }
  return map;
}

function mapSaleSummary(row: {
  id: string;
  created_at: string;
  total: number;
  amount_paid: number | null;
  payment_status: string;
  order_status: string;
  delivery_date: string | null;
  sale_payments?: SalePaymentRow[] | null;
}): CustomerSaleSummary {
  const total = Number(row.total);
  const amount_paid = Number(row.amount_paid ?? 0);
  const payments = [...(row.sale_payments ?? [])].map((p) => ({
    ...p,
    amount: Number(p.amount),
  }));
  payments.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return {
    id: row.id,
    created_at: row.created_at,
    total,
    amount_paid,
    balance: saleBalance(total, amount_paid),
    payment_status: row.payment_status as PaymentStatus,
    order_status: row.order_status as OrderStatus,
    delivery_date: row.delivery_date,
    payments,
  };
}

export async function listCustomersWithStats(query = ""): Promise<CustomerListRow[]> {
  const supabase = createSupabaseServer();
  const [customersRes, salesRes] = await Promise.all([
    supabase.from("customers").select("id, name, email, phone, created_at").order("name"),
    supabase
      .from("sales")
      .select("customer_id, total, amount_paid")
      .eq("status", "completed")
      .not("customer_id", "is", null),
  ]);

  if (customersRes.error) throw new Error(customersRes.error.message);
  if (salesRes.error) throw new Error(salesRes.error.message);

  const agg = aggregateSalesByCustomer((salesRes.data ?? []) as SaleAggRow[]);
  const q = query.trim().toLowerCase();

  let rows: CustomerListRow[] = (customersRes.data ?? []).map((c) => {
    const stats = agg.get(c.id);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      created_at: c.created_at,
      salesCount: stats?.salesCount ?? 0,
      totalPurchased: stats?.totalPurchased ?? 0,
      balanceDue: stats?.balanceDue ?? 0,
    };
  });

  if (q) {
    rows = rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
    );
  }

  rows.sort((a, b) => {
    if (b.balanceDue !== a.balanceDue) return b.balanceDue - a.balanceDue;
    return a.name.localeCompare(b.name, "es");
  });

  return rows;
}

export async function getCustomerById(id: string): Promise<CustomerRow | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as CustomerRow | null;
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const supabase = createSupabaseServer();
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, email, phone, created_at")
    .eq("id", id)
    .maybeSingle();

  if (customerError) throw new Error(customerError.message);
  if (!customer) return null;

  const { data: salesRows, error: salesError } = await supabase
    .from("sales")
    .select(
      `
      id,
      created_at,
      total,
      amount_paid,
      payment_status,
      order_status,
      delivery_date,
      sale_payments ( id, amount, note, created_at )
    `
    )
    .eq("customer_id", id)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (salesError) throw new Error(salesError.message);

  const sales = (salesRows ?? []).map((row) =>
    mapSaleSummary(row as Parameters<typeof mapSaleSummary>[0])
  );

  let totalPurchased = 0;
  let totalPaid = 0;
  let balanceDue = 0;
  for (const s of sales) {
    totalPurchased += s.total;
    totalPaid += s.amount_paid;
    balanceDue += s.balance;
  }

  return {
    customer: customer as CustomerRow & { created_at: string },
    stats: {
      salesCount: sales.length,
      totalPurchased,
      totalPaid,
      balanceDue,
    },
    sales,
  };
}

export async function searchCustomers(query: string): Promise<CustomerRow[]> {
  const q = query.trim();
  const supabase = createSupabaseServer();

  let builder = supabase
    .from("customers")
    .select("id, name, email, phone")
    .order("name", { ascending: true })
    .limit(12);

  if (q.length > 0) {
    builder = builder.ilike("name", `%${q.replace(/%/g, "")}%`);
  }

  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCustomer(input: {
  name: string;
  phone?: string;
  email?: string;
}) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "El nombre del cliente es obligatorio" };

  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select("id, name, email, phone")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/clientes");
  revalidatePath("/ventas", "layout");
  return { ok: true as const, customer: data as CustomerRow };
}

export async function updateCustomer(
  id: string,
  input: { name: string; phone?: string; email?: string }
) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "El nombre del cliente es obligatorio" };

  const supabase = createSupabaseServer();
  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/ventas", "layout");
  revalidatePath("/pagos");
  return { ok: true as const };
}

export async function deleteCustomer(id: string) {
  const supabase = createSupabaseServer();
  const { count, error: countError } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);

  if (countError) return { ok: false as const, error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false as const,
      error: "No se puede eliminar: tiene ventas asociadas. Puedes editar sus datos.",
    };
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/clientes");
  return { ok: true as const };
}
