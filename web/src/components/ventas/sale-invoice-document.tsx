import type { SaleInvoiceData } from "@/app/actions/sales";
import { formatDate, formatDateTime, formatDeliveryDate, formatMoney } from "@/lib/format";
import { orderLabel, paymentLabel } from "@/lib/sale-labels";

/*
 * Colores en hex a propósito: este documento se rasteriza con html2canvas
 * para el PDF y se imprime; no depende de variables CSS del tema.
 */
const INK = "#0f1115";
const SOFT = "#3b3f4a";
const MUTED = "#6d7280";
const FAINT = "#9a9fae";
const LINE = "#e6e7eb";
const PANEL = "#f4f5f8";
const ACCENT = "#3556ff";
const GREEN = "#15803d";
const GREEN_BG = "#e9f7ee";
const RED = "#d1281f";
const RED_BG = "#fdeeec";

export function SaleInvoiceDocument({ invoice }: { invoice: SaleInvoiceData }) {
  const hasBalance = invoice.balance > 0;

  return (
    <article
      id="sale-invoice-sheet"
      className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-[0_8px_32px_rgba(15,17,21,0.10),0_0_0_1px_rgba(15,17,21,0.06)] print:max-w-none print:rounded-none print:shadow-none"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: INK }}
    >
      <header className="px-6 pt-6 pb-5" style={{ background: INK, color: "#fff" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-base font-bold"
              style={{ background: "#fff", color: INK }}
            >
              H
            </span>
            <div>
              <p className="text-[15px] font-bold leading-none tracking-tight">Hader</p>
              <p className="mt-1 text-[11px] leading-none" style={{ color: "rgba(255,255,255,0.65)" }}>
                Comprobante de venta
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className="text-[9px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              N.º
            </p>
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums tracking-wide">
              {invoice.invoiceNumber}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
          {formatDateTime(invoice.createdAt)}
        </p>
      </header>

      <div className="space-y-5 px-6 py-5 text-sm">
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
            Cliente
          </p>
          <p className="mt-1 text-base font-bold tracking-tight" style={{ color: INK }}>
            {invoice.customerName}
          </p>
          {(invoice.customerPhone || invoice.customerEmail) && (
            <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
              {[invoice.customerPhone, invoice.customerEmail].filter(Boolean).join(" · ")}
            </p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 rounded-[12px] p-3.5 text-xs" style={{ background: PANEL }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
              Pago
            </p>
            <p className="mt-0.5 font-semibold" style={{ color: SOFT }}>
              {paymentLabel(invoice.paymentStatus)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
              Pedido
            </p>
            <p className="mt-0.5 font-semibold" style={{ color: SOFT }}>
              {orderLabel(invoice.orderStatus)}
            </p>
          </div>
          {invoice.deliveryDate && (
            <div className="col-span-2 pt-2.5" style={{ borderTop: `1px solid ${LINE}` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
                Fecha de entrega
              </p>
              <p className="mt-0.5 font-semibold" style={{ color: ACCENT }}>
                {formatDeliveryDate(invoice.deliveryDate)}
              </p>
            </div>
          )}
        </section>

        <section>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr
                className="text-left text-[10px] uppercase tracking-[0.12em]"
                style={{ color: MUTED, borderBottom: `2px solid ${INK}` }}
              >
                <th className="pb-2 pr-2 font-bold">Producto</th>
                <th className="w-8 px-1 pb-2 text-center font-bold">Cant</th>
                <th className="px-1 pb-2 text-right font-bold">P.U.</th>
                <th className="pb-2 pl-1 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, i) => (
                <tr key={i} className="align-top" style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td className="py-2.5 pr-2">
                    <p className="font-semibold leading-snug" style={{ color: INK }}>
                      {line.name}
                    </p>
                    {line.variantLabel && (
                      <p className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
                        {line.variantLabel}
                      </p>
                    )}
                  </td>
                  <td className="px-1 py-2.5 text-center font-medium tabular-nums">{line.quantity}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums" style={{ color: MUTED }}>
                    {formatMoney(line.unitPrice)}
                  </td>
                  <td className="py-2.5 pl-1 text-right font-semibold tabular-nums">
                    {formatMoney(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-1.5 pt-3 text-sm" style={{ borderTop: `1px dashed ${FAINT}` }}>
          <div className="flex justify-between" style={{ color: MUTED }}>
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between" style={{ color: MUTED }}>
              <span>Descuento</span>
              <span className="tabular-nums">−{formatMoney(invoice.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold" style={{ color: INK }}>
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(invoice.total)}</span>
          </div>
          <div className="flex justify-between" style={{ color: SOFT }}>
            <span>Abonado</span>
            <span className="font-semibold tabular-nums" style={{ color: GREEN }}>
              {formatMoney(invoice.amountPaid)}
            </span>
          </div>
          <div
            className="mt-1 flex justify-between rounded-[10px] px-3.5 py-2.5"
            style={{
              background: hasBalance ? RED_BG : GREEN_BG,
              color: hasBalance ? RED : GREEN,
            }}
          >
            <span className="font-bold">{hasBalance ? "Saldo pendiente" : "Estado"}</span>
            <span className="text-base font-bold tabular-nums">
              {hasBalance ? formatMoney(invoice.balance) : "Pagado"}
            </span>
          </div>
        </section>

        {invoice.payments.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              Abonos registrados
            </p>
            <ul className="mt-2 space-y-1.5">
              {invoice.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between gap-2 rounded-[8px] px-3 py-1.5 text-xs"
                  style={{ background: PANEL }}
                >
                  <span style={{ color: MUTED }}>{formatDate(p.created_at)}</span>
                  <span className="font-bold tabular-nums" style={{ color: GREEN }}>
                    +{formatMoney(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {invoice.notes?.trim() && (
          <section className="rounded-[10px] px-3.5 py-3" style={{ background: PANEL }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              Notas
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: SOFT }}>
              {invoice.notes.trim()}
            </p>
          </section>
        )}
      </div>

      <footer className="px-6 py-4 text-center" style={{ borderTop: `1px solid ${LINE}` }}>
        <p className="text-xs font-semibold" style={{ color: INK }}>
          Gracias por su compra
        </p>
        <p className="mt-1 text-[10px]" style={{ color: FAINT }}>
          Documento informativo · {formatDate(invoice.createdAt)}
        </p>
        <p className="mt-0.5 font-mono text-[9px]" style={{ color: "#cfd2d9" }}>
          {invoice.id}
        </p>
      </footer>
    </article>
  );
}
