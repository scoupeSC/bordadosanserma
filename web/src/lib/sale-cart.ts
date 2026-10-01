export type CartVariantOption = {
  optionId: string;
  label: string;
  groupName: string;
};

export type CartLine = {
  lineKey: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  optionIds: string[];
  variantLabel: string;
};

type ProductLike = {
  id: string;
  name: string;
  unit_price: number;
  variantGroups: {
    groupId: string;
    groupName: string;
    options: { id: string; label: string }[];
  }[];
};

const DRAFT_PREFIX = "::draft::";

export function isDraftLineKey(lineKey: string) {
  return lineKey.includes(DRAFT_PREFIX);
}

export function buildCartLineKey(productId: string, optionIds: string[], draftId?: string) {
  const sorted = [...optionIds].sort().join(",");
  if (draftId) return `${productId}::${sorted}${DRAFT_PREFIX}${draftId}`;
  return `${productId}::${sorted}`;
}

export function newDraftLineKey(productId: string) {
  return buildCartLineKey(productId, [], crypto.randomUUID());
}

export function variantSelectionComplete(
  product: ProductLike,
  selected: Record<string, string>
): boolean {
  if (product.variantGroups.length === 0) return true;
  return product.variantGroups.every((g) => Boolean(selected[g.groupId]));
}

export function isCartLineComplete(line: CartLine, product: ProductLike | null): boolean {
  if (!product || product.variantGroups.length === 0) return true;
  const selected = selectedVariantsFromLine(line, product);
  return variantSelectionComplete(product, selected);
}

export function formatVariantLabel(options: CartVariantOption[]) {
  if (options.length === 0) return "";
  return options.map((o) => o.label).join(" · ");
}

export function selectedVariantsFromLine(
  line: CartLine,
  product: ProductLike
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const g of product.variantGroups) {
    for (const opt of g.options) {
      if (line.optionIds.includes(opt.id)) {
        map[g.groupId] = opt.id;
      }
    }
  }
  return map;
}

export function buildCartLineFromSelection(
  product: ProductLike,
  selected: Record<string, string>,
  quantity: number,
  opts?: { previousLineKey?: string }
): CartLine {
  const parts: CartVariantOption[] = product.variantGroups
    .map((g) => {
      const id = selected[g.groupId];
      const opt = g.options.find((o) => o.id === id);
      return opt ? { optionId: opt.id, label: opt.label, groupName: g.groupName } : null;
    })
    .filter(Boolean) as CartVariantOption[];

  const optionIds = parts.map((p) => p.optionId);
  const complete = variantSelectionComplete(product, selected);

  let lineKey = buildCartLineKey(product.id, optionIds);
  if (!complete) {
    const prev = opts?.previousLineKey;
    if (prev && isDraftLineKey(prev)) {
      lineKey = prev;
    } else {
      lineKey = newDraftLineKey(product.id);
    }
  }

  return {
    lineKey,
    productId: product.id,
    name: product.name,
    unitPrice: product.unit_price,
    quantity: Math.max(1, quantity),
    optionIds,
    variantLabel: formatVariantLabel(parts),
  };
}

export function createEmptyVariantLine(product: ProductLike, quantity = 1): CartLine {
  return buildCartLineFromSelection(product, {}, quantity);
}
