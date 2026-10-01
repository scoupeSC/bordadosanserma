import type { ProductRow } from "@/lib/types";

/** IDs de etiquetas guardadas (compatible con respuestas anidadas de Supabase). */
export function extractProductOptionIds(product: ProductRow): string[] {
  const ids = new Set<string>();

  for (const row of product.product_attribute_options ?? []) {
    if (row.option_id) ids.add(row.option_id);
    const opt = row.attribute_options;
    if (opt && !Array.isArray(opt) && opt.id) ids.add(opt.id);
  }

  return [...ids];
}

export function formatPriceForInput(price: number): string {
  if (!Number.isFinite(price)) return "";
  const rounded = Math.round(price * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
