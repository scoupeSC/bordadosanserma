import type { ProductRow } from "@/lib/types";

export type ProductAssignedTag = {
  id: string;
  label: string;
  groupName: string;
};

/** Etiquetas vinculadas a un producto (con nombre para la UI). */
export function extractAssignedTags(product: ProductRow): ProductAssignedTag[] {
  const out: ProductAssignedTag[] = [];
  const seen = new Set<string>();

  for (const row of product.product_attribute_options ?? []) {
    const opt = row.attribute_options;
    if (!opt || Array.isArray(opt)) continue;
    const id = opt.id ?? row.option_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const g = opt.attribute_groups;
    const groupName =
      g && !Array.isArray(g) ? g.name : Array.isArray(g) && g[0]?.name ? g[0].name : "Etiqueta";
    const displayLabel = row.label?.trim() || opt.label;
    out.push({ id, label: displayLabel, groupName });
  }

  return out;
}

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
