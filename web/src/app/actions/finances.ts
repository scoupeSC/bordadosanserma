"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import {
  bogotaDateKey,
  bucketKeyForDate,
  buildBucketSeries,
  formatBucketLabel,
  resolveFinanceRange,
  type FinanceGrain,
  type FinancePreset,
} from "@/lib/finance-period";

export type FinanceSummary = {
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
  unitsSold: number;
  avgTicket: number;
};

export type FinanceSeriesPoint = {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
};

export type TopProductRow = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type FinanceDashboardData = {
  rangeLabel: string;
  grain: FinanceGrain;
  from: string;
  to: string;
  summary: FinanceSummary;
  series: FinanceSeriesPoint[];
  topProducts: TopProductRow[];
};

function emptyBuckets(from: string, to: string, grain: FinanceGrain) {
  const keys = buildBucketSeries(from, to, grain);
  return keys.map((key) => ({
    key,
    label: formatBucketLabel(key, grain),
    revenue: 0,
    expenses: 0,
    profit: 0,
    orders: 0,
  }));
}

export async function getFinanceDashboard(input: {
  preset: FinancePreset;
  customFrom?: string;
  customTo?: string;
}): Promise<FinanceDashboardData> {
  const range = resolveFinanceRange(input.preset, input.customFrom, input.customTo);
  const expenseFrom = range.from.slice(0, 10);
  const expenseTo = bogotaDateKey(new Date(new Date(range.to).getTime() - 86400000));
  const supabase = createSupabaseServer();

  const [salesRes, expensesRes, itemsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total, created_at")
      .eq("status", "completed")
      .gte("created_at", range.from)
      .lt("created_at", range.to),
    supabase
      .from("expenses")
      .select("amount, expense_date")
      .gte("expense_date", expenseFrom)
      .lte("expense_date", expenseTo),
    supabase
      .from("sale_items")
      .select(
        `
        product_id,
        quantity,
        line_total,
        products ( name ),
        sales!inner ( id, status, created_at )
      `
      )
      .eq("sales.status", "completed")
      .gte("sales.created_at", range.from)
      .lt("sales.created_at", range.to),
  ]);

  if (salesRes.error) throw new Error(salesRes.error.message);
  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  const sales = salesRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const items = itemsRes.data ?? [];

  const bucketMap = new Map<string, FinanceSeriesPoint>();
  for (const b of emptyBuckets(range.from, range.to, range.grain)) {
    bucketMap.set(b.key, { ...b });
  }

  let revenue = 0;
  for (const sale of sales) {
    const total = Number(sale.total);
    revenue += total;
    const key = bucketKeyForDate(sale.created_at, range.grain);
    const row = bucketMap.get(key);
    if (row) {
      row.revenue += total;
      row.orders += 1;
    }
  }

  let expenseTotal = 0;
  for (const exp of expenses) {
    const amount = Number(exp.amount);
    expenseTotal += amount;
    const iso = `${exp.expense_date}T12:00:00.000Z`;
    const key = bucketKeyForDate(iso, range.grain);
    const row = bucketMap.get(key);
    if (row) row.expenses += amount;
  }

  const series = [...bucketMap.values()].map((row) => ({
    ...row,
    profit: row.revenue - row.expenses,
  }));

  const productMap = new Map<string, TopProductRow>();
  let unitsSold = 0;
  for (const item of items) {
    const qty = item.quantity;
    const lineTotal = Number(item.line_total);
    unitsSold += qty;
    const pid = item.product_id as string;
    const prod = item.products as { name: string } | { name: string }[] | null;
    const name = Array.isArray(prod) ? (prod[0]?.name ?? "Producto") : (prod?.name ?? "Producto");
    const existing = productMap.get(pid);
    if (!existing) {
      productMap.set(pid, { productId: pid, name, quantity: qty, revenue: lineTotal });
    } else {
      existing.quantity += qty;
      existing.revenue += lineTotal;
    }
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 8);

  const orders = sales.length;
  const profit = revenue - expenseTotal;

  return {
    rangeLabel: range.label,
    grain: range.grain,
    from: range.from,
    to: range.to,
    summary: {
      revenue,
      expenses: expenseTotal,
      profit,
      orders,
      unitsSold,
      avgTicket: orders > 0 ? revenue / orders : 0,
    },
    series,
    topProducts,
  };
}
