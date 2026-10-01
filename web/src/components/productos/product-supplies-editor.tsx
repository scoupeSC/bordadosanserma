"use client";

import { Plus, Trash2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleRow } from "@/components/ui/toggle-row";
import { formatMoney } from "@/lib/format";
import {
  parseOptionalSupplyPrice,
  parseSupplyQuantity,
  suppliesCostPerUnit,
  type ProductSupplyPayload,
} from "@/lib/product-supplies";

export type SupplyDraft = {
  key: string;
  name: string;
  quantity: string;
  unitPrice: string;
};

type Props = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  rows: SupplyDraft[];
  onRowsChange: (rows: SupplyDraft[]) => void;
  disabled?: boolean;
};

function newRow(): SupplyDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    quantity: "",
    unitPrice: "",
  };
}

export function ProductSuppliesEditor({
  enabled,
  onEnabledChange,
  rows,
  onRowsChange,
  disabled,
}: Props) {
  const costPreview = (() => {
    if (!enabled || rows.length === 0) return null;
    const parsed: { quantity: number; unit_price: number | null }[] = [];
    for (const row of rows) {
      const q = parseSupplyQuantity(row.quantity);
      if (!q.ok) continue;
      const p = parseOptionalSupplyPrice(row.unitPrice);
      if (!p.ok) continue;
      parsed.push({ quantity: q.value, unit_price: p.value });
    }
    if (parsed.length === 0) return null;
    const total = suppliesCostPerUnit(parsed);
    if (total <= 0) return null;
    return total;
  })();

  const updateRow = (key: string, patch: Partial<SupplyDraft>) => {
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    onRowsChange(rows.filter((r) => r.key !== key));
  };

  return (
    <div className="space-y-4">
      <ToggleRow
        checked={enabled}
        disabled={disabled}
        icon={FlaskConical}
        title="Registrar insumos"
        description="Materia prima o materiales necesarios para fabricar 1 unidad de este producto."
        onChange={(on) => {
          onEnabledChange(on);
          if (on && rows.length === 0) onRowsChange([newRow()]);
        }}
      />

      {enabled && (
        <>
          <ul className="space-y-3">
            {rows.map((row, index) => (
              <li key={row.key} className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-muted)]/50 p-3.5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="eyebrow">Insumo {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={disabled}
                    className="icon-btn h-8 w-8 hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                    aria-label="Quitar insumo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block sm:col-span-2 lg:col-span-1">
                    <span className="label mb-1.5 text-xs">Nombre</span>
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      disabled={disabled}
                      placeholder="Ej. Tela, hilo, botones…"
                      className="field field-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="label mb-1.5 text-xs">Cantidad por unidad</span>
                    <input
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      disabled={disabled}
                      inputMode="decimal"
                      placeholder="Ej. 1.5"
                      className="field field-sm tabular-nums"
                    />
                  </label>
                  <label className="block">
                    <span className="label mb-1.5 text-xs">Precio unitario (opcional)</span>
                    <input
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })}
                      disabled={disabled}
                      inputMode="decimal"
                      placeholder="Costo por unidad"
                      className="field field-sm tabular-nums"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onRowsChange([...rows, newRow()])}
            >
              <Plus className="h-4 w-4" />
              Agregar insumo
            </Button>

            {costPreview != null && (
              <p className="text-xs text-[var(--muted)]">
                Costo estimado por unidad{" "}
                <span className="font-bold tabular-nums text-[var(--ink)]">{formatMoney(costPreview)}</span>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function suppliesFromInitial(
  rows: { name: string; quantity: number; unit_price: number | null }[]
): SupplyDraft[] {
  if (rows.length === 0) return [];
  return rows.map((r) => ({
    key: crypto.randomUUID(),
    name: r.name,
    quantity: String(r.quantity),
    unitPrice: r.unit_price != null ? String(r.unit_price) : "",
  }));
}

export function parseSupplyDrafts(rows: SupplyDraft[]): { ok: true; supplies: ProductSupplyPayload[] } | { ok: false; error: string } {
  const supplies: ProductSupplyPayload[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name.trim();
    if (!name) {
      return { ok: false, error: `El insumo ${i + 1} necesita un nombre` };
    }
    const q = parseSupplyQuantity(row.quantity);
    if (!q.ok) return { ok: false, error: `Insumo «${name}»: ${q.error}` };
    const p = parseOptionalSupplyPrice(row.unitPrice);
    if (!p.ok) return { ok: false, error: `Insumo «${name}»: ${p.error}` };
    supplies.push({ name, quantity: q.value, unitPrice: p.value });
  }
  return { ok: true, supplies };
}
