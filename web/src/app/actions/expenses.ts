"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

export type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
};

function parseAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false as const, error: "El monto debe ser mayor a cero" };
  }
  return { ok: true as const, amount: Math.round(value * 100) / 100 };
}

function parseDescription(description: string) {
  const text = description.trim();
  if (!text) return { ok: false as const, error: "Escribe una descripción" };
  return { ok: true as const, description: text };
}

function parseExpenseDate(date: string) {
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false as const, error: "Fecha inválida" };
  }
  return { ok: true as const, expense_date: trimmed };
}

function mapRow(row: {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
}): ExpenseRow {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

export async function listExpenses(limit = 200): Promise<ExpenseRow[]> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, description, amount, expense_date, created_at")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getExpense(id: string): Promise<ExpenseRow | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, description, amount, expense_date, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data);
}

export async function createExpense(input: {
  description: string;
  amount: number;
  expenseDate: string;
}) {
  const desc = parseDescription(input.description);
  if (!desc.ok) return desc;
  const amt = parseAmount(input.amount);
  if (!amt.ok) return amt;
  const date = parseExpenseDate(input.expenseDate);
  if (!date.ok) return date;

  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      description: desc.description,
      amount: amt.amount,
      expense_date: date.expense_date,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/gastos");
  return { ok: true as const, id: data.id as string };
}

export async function updateExpense(
  id: string,
  input: { description: string; amount: number; expenseDate: string }
) {
  const desc = parseDescription(input.description);
  if (!desc.ok) return desc;
  const amt = parseAmount(input.amount);
  if (!amt.ok) return amt;
  const date = parseExpenseDate(input.expenseDate);
  if (!date.ok) return date;

  const supabase = createSupabaseServer();
  const { error } = await supabase
    .from("expenses")
    .update({
      description: desc.description,
      amount: amt.amount,
      expense_date: date.expense_date,
    })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/gastos");
  revalidatePath(`/gastos/${id}/editar`);
  return { ok: true as const };
}

export async function deleteExpense(id: string) {
  const supabase = createSupabaseServer();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/gastos");
  return { ok: true as const };
}

export async function expensesSummary(): Promise<{ count: number; total: number }> {
  const rows = await listExpenses(500);
  return {
    count: rows.length,
    total: rows.reduce((acc, r) => acc + r.amount, 0),
  };
}
