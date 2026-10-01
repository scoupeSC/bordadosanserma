export type ProductSupplyRow = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number | null;
  sort_order: number;
};

export type ProductSupplyPayload = {
  name: string;
  quantity: number;
  unitPrice?: number | null;
};

export function parseSupplyQuantity(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const cleaned = raw.replace(/\s/g, "").replace(/,/g, ".");
  if (!cleaned) {
    return { ok: false, error: "Indica la cantidad del insumo" };
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "La cantidad debe ser mayor a cero" };
  }
  return { ok: true, value: n };
}

export function parseOptionalSupplyPrice(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const cleaned = raw.replace(/\s/g, "").replace(/,/g, ".");
  if (!cleaned) return { ok: true, value: null };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: "El precio del insumo debe ser 0 o más" };
  }
  return { ok: true, value: n };
}

export function suppliesCostPerUnit(supplies: { quantity: number; unit_price: number | null }[]) {
  return supplies.reduce((acc, s) => acc + s.quantity * (s.unit_price ?? 0), 0);
}
