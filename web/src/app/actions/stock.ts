"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

export type StockMovementType = "in" | "out" | "adjustment";

export type StockProductRow = {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  unit_price: number;
  track_stock: boolean;
  isLow: boolean;
};

export type StockMovementRow = {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  notes: string | null;
  created_at: string;
  products?: { name: string } | null;
};

export async function listStockProducts(query = ""): Promise<StockProductRow[]> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock, min_stock, unit_price, track_stock")
    .eq("is_active", true)
    .eq("track_stock", true)
    .order("name");

  if (error) throw new Error(error.message);

  const q = query.trim().toLowerCase();
  let rows = (data ?? []).map((p) => {
    const stock = Number(p.stock);
    const min_stock = Number(p.min_stock ?? 0);
    return {
      id: p.id,
      name: p.name,
      stock,
      min_stock,
      unit_price: Number(p.unit_price),
      track_stock: Boolean(p.track_stock),
      isLow: stock <= min_stock,
    };
  });

  if (q) {
    rows = rows.filter((p) => p.name.toLowerCase().includes(q));
  }

  rows.sort((a, b) => {
    if (a.isLow !== b.isLow) return a.isLow ? -1 : 1;
    return a.name.localeCompare(b.name, "es");
  });

  return rows;
}

export async function listRecentStockMovements(limit = 40): Promise<StockMovementRow[]> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select(
      `
      id,
      product_id,
      movement_type,
      quantity,
      notes,
      created_at,
      products!inner ( name, track_stock, is_active )
    `
    )
    .eq("products.track_stock", true)
    .eq("products.is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    movement_type: row.movement_type as StockMovementType,
    quantity: Number(row.quantity),
    notes: row.notes,
    created_at: row.created_at,
    products: Array.isArray(row.products) ? row.products[0] : row.products,
  }));
}

export async function adjustProductStock(input: {
  productId: string;
  movementType: StockMovementType;
  quantity: number;
  note?: string;
}) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { ok: false as const, error: "Indica una cantidad mayor a cero" };
  }

  const supabase = createSupabaseServer();
  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: input.productId,
    p_movement_type: input.movementType,
    p_quantity: Math.round(input.quantity),
    p_notes: input.note?.trim() || null,
  });

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/inventario");
  revalidatePath("/productos");
  revalidatePath("/");
  return { ok: true as const };
}
