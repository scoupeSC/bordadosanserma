import Link from "next/link";
import { FileText, Pencil, Receipt } from "lucide-react";
import { formatDate, formatDeliveryDate, formatMoney } from "@/lib/format";
import { orderLabel, paymentLabel, saleBalance } from "@/lib/sale-labels";
import type { SaleListRow } from "@/app/actions/sales";
import { DeleteSaleButton } from "@/components/ventas/delete-sale-button";
import { Chip, orderTone, paymentTone } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";

function customerName(sale: SaleListRow) {
  return sale.customers?.name ?? sale.customer_name ?? "Sin cliente";
}

export function SalesList({
  sales,
  emptyMessage,
}: {
  sales: SaleListRow[];
  emptyMessage?: string;
}) {
  if (sales.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        compact
        title={emptyMessage ? "Sin resultados" : "Aún no hay ventas"}
        description={
          emptyMessage ?? (
            <>
              <Link href="/ventas/nueva" className="link">
                Registra la primera
              </Link>{" "}
              desde el catálogo.
            </>
          )
        }
      />
    );
  }

  return (
    <ul className="grid gap-2.5 md:grid-cols-2">
      {sales.map((sale) => {
        const total = Number(sale.total);
        const paid = Number(sale.amount_paid ?? 0);
        const balance = saleBalance(total, paid);
        const owes = sale.payment_status === "partial" || sale.payment_status === "credit";

        return (
          <li key={sale.id} className="card card-hover flex flex-col">
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold tracking-tight text-[var(--ink)]">
                  {customerName(sale)}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDate(sale.created_at)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold tabular-nums tracking-tight text-[var(--ink)]">
                  {formatMoney(total)}
                </p>
                {owes && (
                  <p className="text-xs font-semibold tabular-nums text-[var(--danger)]">
                    Saldo {formatMoney(balance)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              <Chip tone={paymentTone(sale.payment_status)} dot>
                {paymentLabel(sale.payment_status)}
              </Chip>
              <Chip tone={orderTone(sale.order_status)} dot>
                {orderLabel(sale.order_status)}
              </Chip>
              {sale.delivery_date && (
                <Chip tone="muted">Entrega {formatDeliveryDate(sale.delivery_date)}</Chip>
              )}
            </div>

            <div className="mt-auto flex items-center gap-1 border-t border-[var(--line)] px-2 py-2">
              <Link
                href={`/ventas/${sale.id}/factura`}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Comprobante
              </Link>
              <Link
                href={`/ventas/${sale.id}/editar`}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Editar
              </Link>
              <span className="ml-auto">
                <DeleteSaleButton saleId={sale.id} label="Anular" compact />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
