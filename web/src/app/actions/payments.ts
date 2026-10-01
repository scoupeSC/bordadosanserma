"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { saleBalance, type PaymentStatus } from "@/lib/sale-labels";

export type SalePaymentRow = {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
};

export type SaleWithBalance = {
  id: string;
  created_at: string;
  customer_name: string;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  delivery_date: string | null;
  payments: SalePaymentRow[];
};

function customerDisplay(row: {
  customer_name: string | null;
  customers: { name: string } | { name: string }[] | null;
}) {
  const c = row.customers;
  const name = Array.isArray(c) ? c[0]?.name : c?.name;
  return name ?? row.customer_name ?? "Sin cliente";
}

export async function listSalesWithBalance(query = ""): Promise<SaleWithBalance[]> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id,
      created_at,
      customer_name,
      total,
      amount_paid,
      payment_status,
      delivery_date,
      customers ( name ),
      sale_payments ( id, amount, note, created_at )
    `
    )
    .eq("status", "completed")
    .in("payment_status", ["credit", "partial"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const q = query.trim().toLowerCase();
  let rows = (data ?? []).map((row) => {
    const total = Number(row.total);
    const amount_paid = Number(row.amount_paid ?? 0);
    const payments = (row.sale_payments ?? []) as SalePaymentRow[];
    payments.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return {
      id: row.id,
      created_at: row.created_at,
      customer_name: customerDisplay(row as Parameters<typeof customerDisplay>[0]),
      total,
      amount_paid,
      balance: saleBalance(total, amount_paid),
      payment_status: row.payment_status as PaymentStatus,
      delivery_date: row.delivery_date,
      payments: payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  });

  rows = rows.filter((r) => r.balance > 0);

  if (q) {
    rows = rows.filter((r) => r.customer_name.toLowerCase().includes(q));
  }

  rows.sort((a, b) => b.balance - a.balance || b.created_at.localeCompare(a.created_at));
  return rows;
}

export async function registerSalePayment(input: {
  saleId: string;
  amount: number;
  note?: string;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false as const, error: "Indica un monto válido" };
  }

  const supabase = createSupabaseServer();
  const { data, error } = await supabase.rpc("register_sale_payment", {
    p_sale_id: input.saleId,
    p_amount: input.amount,
    p_note: input.note?.trim() || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/pagos");
  revalidatePath("/ventas");
  revalidatePath("/pedidos");
  revalidatePath("/clientes", "layout");
  revalidatePath("/ventas", "layout");
  return { ok: true as const, paymentId: data as string };
}
