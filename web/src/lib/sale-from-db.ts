import {
  buildCartLineKey,
  formatVariantLabel,
  type CartLine,
  type CartVariantOption,
} from "@/lib/sale-cart";

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

type SaleItemRow = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products?: { name: string } | null;
  sale_item_options?: OptionRow[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function variantPartsFromOptions(rows: OptionRow[] | null | undefined): CartVariantOption[] {
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
  return parts;
}

/** Convierte líneas guardadas en el carrito editable (una fila DB = una tarjeta). */
export function saleItemsToCartLines(items: SaleItemRow[]): CartLine[] {
  return items.map((item) => {
    const parts = variantPartsFromOptions(item.sale_item_options);
    const optionIds = parts.map((p) => p.optionId);
    const name = item.products?.name ?? "Producto";
    return {
      lineKey: `si:${item.id}`,
      productId: item.product_id,
      name,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      optionIds,
      variantLabel: formatVariantLabel(parts),
    };
  });
}

/** Agrupa ítems iguales al agregar desde catálogo (no usado al cargar venta). */
export function mergeCartLinesByVariant(lines: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of lines) {
    const key = buildCartLineKey(line.productId, line.optionIds);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...line, lineKey: key });
    } else {
      map.set(key, { ...existing, quantity: existing.quantity + line.quantity });
    }
  }
  return [...map.values()];
}
