export type SupplyBreakdownRow = {
  productName: string;
  variantLabel: string;
  itemQuantity: number;
  supplyPerUnit: number;
  lineTotal: number;
};

export type AggregatedSupplyLine = {
  name: string;
  totalQuantity: number;
  unitPrice: number | null;
  estimatedCost: number | null;
  breakdown: SupplyBreakdownRow[];
};

export type OrderSuppliesSummary = {
  id: string;
  orderNumber: string;
  created_at: string;
  order_status: "pending" | "ready" | "delivered";
  delivery_date: string | null;
  customer_name: string;
  total: number;
  lines: AggregatedSupplyLine[];
  estimatedMaterialCost: number | null;
  hasSupplies: boolean;
};

export function orderNumberFromSaleId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

type RawSupply = {
  name: string;
  quantity: number;
  unit_price: number | null;
};

export function aggregateSuppliesForItems(
  items: {
    productName: string;
    variantLabel: string;
    quantity: number;
    supplies: RawSupply[];
  }[]
): AggregatedSupplyLine[] {
  const map = new Map<
    string,
    {
      displayName: string;
      totalQuantity: number;
      unitPrice: number | null;
      breakdown: SupplyBreakdownRow[];
    }
  >();

  for (const item of items) {
    if (item.supplies.length === 0) continue;
    for (const supply of item.supplies) {
      const key = supply.name.trim().toLowerCase();
      if (!key) continue;
      const perUnit = Number(supply.quantity);
      const lineTotal = perUnit * item.quantity;
      const existing = map.get(key);
      const row: SupplyBreakdownRow = {
        productName: item.productName,
        variantLabel: item.variantLabel,
        itemQuantity: item.quantity,
        supplyPerUnit: perUnit,
        lineTotal,
      };
      if (!existing) {
        map.set(key, {
          displayName: supply.name.trim(),
          totalQuantity: lineTotal,
          unitPrice: supply.unit_price,
          breakdown: [row],
        });
      } else {
        existing.totalQuantity += lineTotal;
        existing.breakdown.push(row);
        if (existing.unitPrice != null && supply.unit_price != null && existing.unitPrice !== supply.unit_price) {
          existing.unitPrice = null;
        } else if (existing.unitPrice == null && supply.unit_price != null) {
          existing.unitPrice = supply.unit_price;
        }
      }
    }
  }

  return [...map.values()]
    .map((v) => ({
      name: v.displayName,
      totalQuantity: v.totalQuantity,
      unitPrice: v.unitPrice,
      estimatedCost:
        v.unitPrice != null ? Math.round(v.totalQuantity * v.unitPrice * 100) / 100 : null,
      breakdown: v.breakdown,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function mergeOrderSupplyLines(orders: OrderSuppliesSummary[]): AggregatedSupplyLine[] {
  const map = new Map<
    string,
    {
      displayName: string;
      totalQuantity: number;
      unitPrice: number | null;
      estimatedCost: number | null;
      breakdown: SupplyBreakdownRow[];
    }
  >();

  for (const order of orders) {
    for (const line of order.lines) {
      const key = line.name.trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          displayName: line.name,
          totalQuantity: line.totalQuantity,
          unitPrice: line.unitPrice,
          estimatedCost: line.estimatedCost,
          breakdown: [...line.breakdown],
        });
      } else {
        existing.totalQuantity += line.totalQuantity;
        if (existing.estimatedCost != null && line.estimatedCost != null) {
          existing.estimatedCost += line.estimatedCost;
        } else {
          existing.estimatedCost = null;
        }
        existing.breakdown.push(...line.breakdown);
        if (existing.unitPrice != null && line.unitPrice != null && existing.unitPrice !== line.unitPrice) {
          existing.unitPrice = null;
        }
      }
    }
  }

  return [...map.values()]
    .map((v) => ({
      name: v.displayName,
      totalQuantity: v.totalQuantity,
      unitPrice: v.unitPrice,
      estimatedCost: v.estimatedCost,
      breakdown: v.breakdown,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function orderMaterialCost(lines: AggregatedSupplyLine[]) {
  let sum = 0;
  let any = false;
  for (const line of lines) {
    if (line.estimatedCost != null) {
      sum += line.estimatedCost;
      any = true;
    }
  }
  return any ? sum : null;
}
