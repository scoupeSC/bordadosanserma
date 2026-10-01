import type { ProductVariantGroup } from "@/app/actions/sales";

type StoreCatalogGroup = {
  id: string;
  name: string;
  display_order?: number;
  options: { id: string; label: string; display_order?: number }[];
};

type AttributeGroupRef = { id: string; name: string; display_order?: number };
type AttributeOptionRef = {
  id: string;
  label: string;
  group_id?: string;
  attribute_groups?: AttributeGroupRef | AttributeGroupRef[] | null;
};

export type ProductAttributeLink = {
  option_id?: string;
  attribute_options?: AttributeOptionRef | AttributeOptionRef[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Agrupa las etiquetas del producto por categoría (Color, Talla…). */
export function parseVariantGroups(links: ProductAttributeLink[] | null | undefined): ProductVariantGroup[] {
  const groupMap = new Map<string, ProductVariantGroup & { order: number }>();

  for (const row of links ?? []) {
    const opt = first(row.attribute_options);
    if (!opt) continue;

    const optId = opt.id ?? row.option_id;
    if (!optId) continue;

    const group = first(opt.attribute_groups);
    if (!group?.id) continue;

    let entry = groupMap.get(group.id);
    if (!entry) {
      entry = {
        groupId: group.id,
        groupName: group.name,
        options: [],
        order: group.display_order ?? 0,
      };
      groupMap.set(group.id, entry);
    }

    if (!entry.options.some((o) => o.id === optId)) {
      entry.options.push({ id: optId, label: opt.label });
    }
  }

  return [...groupMap.values()]
    .sort((a, b) => a.order - b.order || a.groupName.localeCompare(b.groupName, "es"))
    .map(({ order: _order, ...g }) => {
      g.options.sort((a, b) => a.label.localeCompare(b.label, "es"));
      return g;
    });
}

/** Catálogo global de la tienda (color, talla…) cuando el producto no tiene etiquetas propias. */
export function variantGroupsFromStoreCatalog(groups: StoreCatalogGroup[]): ProductVariantGroup[] {
  return groups
    .filter((g) => g.options.length > 0)
    .map((g) => ({
      groupId: g.id,
      groupName: g.name,
      options: [...g.options]
        .sort(
          (a, b) =>
            (a.display_order ?? 0) - (b.display_order ?? 0) ||
            a.label.localeCompare(b.label, "es")
        )
        .map(({ id, label }) => ({ id, label })),
    }))
    .sort(
      (a, b) =>
        (groups.find((g) => g.id === a.groupId)?.display_order ?? 0) -
          (groups.find((g) => g.id === b.groupId)?.display_order ?? 0) ||
        a.groupName.localeCompare(b.groupName, "es")
    );
}
