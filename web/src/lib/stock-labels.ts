import type { StockMovementType } from "@/app/actions/stock";

const movementLabels: Record<StockMovementType, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

export function stockMovementLabel(type: StockMovementType) {
  return movementLabels[type] ?? type;
}
