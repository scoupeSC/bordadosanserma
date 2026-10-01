"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Banknote, ChevronDown, ChevronUp, Wallet } from "lucide-react";
import type { SaleWithBalance } from "@/app/actions/payments";
import { registerSalePayment } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { Chip, paymentTone } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { SearchField } from "@/components/ui/search-field";
import { formatDate, formatDateTime, formatDeliveryDate, formatMoney } from "@/lib/format";
import { paymentLabel, saleBalance } from "@/lib/sale-labels";

export function PaymentsList({ initialSales }: { initialSales: SaleWithBalance[] }) {
  const [sales, setSales] = useState(initialSales);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) => s.customer_name.toLowerCase().includes(q));
  }, [sales, query]);

  const totalOutstanding = useMemo(
    () => sales.reduce((acc, s) => acc + s.balance, 0),
    [sales]
  );

  const submitPayment = (sale: SaleWithBalance) => {
    setError(null);
    const raw = amounts[sale.id] ?? "";
    const amount = Number(String(raw).replace(/,/g, "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Escribe cuánto abona el cliente");
      return;
    }
    if (amount > sale.balance) {
      setError(`El abono no puede superar el saldo (${formatMoney(sale.balance)})`);
      return;
    }

    startTransition(async () => {
      const result = await registerSalePayment({
        saleId: sale.id,
        amount,
        note: notes[sale.id],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSales((prev) => {
        const nextPaid = sale.amount_paid + amount;
        const newBalance = saleBalance(sale.total, nextPaid);
        if (newBalance <= 0) {
          return prev.filter((s) => s.id !== sale.id);
        }
        return prev.map((s) =>
          s.id === sale.id
            ? {
                ...s,
                amount_paid: nextPaid,
                balance: newBalance,
                payment_status: newBalance > 0 ? "partial" : "paid",
                payments: [
                  {
                    id: result.paymentId,
                    amount,
                    note: notes[sale.id]?.trim() || null,
                    created_at: new Date().toISOString(),
                  },
                  ...s.payments,
                ],
              }
            : s
        );
      });
      setAmounts((a) => ({ ...a, [sale.id]: "" }));
      setNotes((n) => ({ ...n, [sale.id]: "" }));
      setExpanded(null);
    });
  };

  const payFull = (sale: SaleWithBalance) => {
    setAmounts((a) => ({ ...a, [sale.id]: String(sale.balance) }));
  };

  if (sales.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Todo al día"
        description="No hay pedidos con saldo pendiente. Los fiados y abonos parciales aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="card card-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar por cliente…"
            className="min-w-0 flex-1"
          />
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] bg-[var(--danger-bg)] px-4 py-2.5 sm:block sm:text-right">
            <p className="eyebrow text-[var(--danger)]/70">Saldo total</p>
            <p className="text-lg font-bold tabular-nums leading-none text-[var(--danger)]">
              {formatMoney(totalOutstanding)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-[var(--muted)]">
          <span className="font-bold text-[var(--ink)]">{filtered.length}</span> pedido(s) con saldo
        </p>
      </div>

      {error && <Notice>{error}</Notice>}

      <ul className="grid gap-3 md:grid-cols-2">
        {filtered.map((sale) => {
          const open = expanded === sale.id;
          const pct = sale.total > 0 ? Math.min(100, Math.round((sale.amount_paid / sale.total) * 100)) : 0;
          return (
            <li
              key={sale.id}
              className={`card card-pad transition-shadow ${open ? "md:col-span-2 shadow-[var(--shadow-hover)]" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold tracking-tight text-[var(--ink)]">
                    {sale.customer_name}
                  </p>
                  <p className="text-xs text-[var(--muted)]">Pedido · {formatDate(sale.created_at)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone={paymentTone(sale.payment_status)} dot>
                      {paymentLabel(sale.payment_status)}
                    </Chip>
                    {sale.delivery_date && (
                      <Chip tone="muted">Entrega {formatDeliveryDate(sale.delivery_date)}</Chip>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="eyebrow">Saldo</p>
                  <p className="text-xl font-bold tabular-nums leading-tight text-[var(--danger)]">
                    {formatMoney(sale.balance)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--success)] transition-[width]"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-[var(--muted)]">
                  <span>
                    Abonado{" "}
                    <span className="font-semibold tabular-nums text-[var(--success)]">
                      {formatMoney(sale.amount_paid)}
                    </span>
                  </span>
                  <span>
                    Total <span className="font-semibold tabular-nums text-[var(--ink)]">{formatMoney(sale.total)}</span>
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant={open ? "primary" : "accent"}
                  onClick={() => setExpanded(open ? null : sale.id)}
                >
                  <Banknote className="h-4 w-4" />
                  Registrar abono
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Link href={`/ventas/${sale.id}/editar`} className="link ml-auto text-[13px]">
                  Ver venta
                </Link>
              </div>

              {open && (
                <div className="mt-3 space-y-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-3 animate-fade">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="min-w-0 flex-1">
                      <span className="label mb-1.5 text-xs text-[var(--muted)]">Monto del abono</span>
                      <input
                        inputMode="decimal"
                        value={amounts[sale.id] ?? ""}
                        onChange={(e) =>
                          setAmounts((a) => ({ ...a, [sale.id]: e.target.value }))
                        }
                        placeholder="Ej. 50000"
                        className="field text-base font-bold tabular-nums"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => payFull(sale)}
                      className="h-11 shrink-0 rounded-[var(--radius-sm)] border border-dashed border-[var(--accent)] px-4 text-[13px] font-bold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
                    >
                      Saldo completo
                    </button>
                  </div>
                  <label className="block">
                    <span className="label mb-1.5 text-xs text-[var(--muted)]">Nota (opcional)</span>
                    <input
                      value={notes[sale.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [sale.id]: e.target.value }))}
                      placeholder="Ej. Efectivo, Nequi…"
                      className="field"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="accent"
                    className="w-full sm:w-auto"
                    disabled={pending}
                    onClick={() => submitPayment(sale)}
                  >
                    {pending ? "Guardando…" : "Confirmar abono"}
                  </Button>
                </div>
              )}

              {sale.payments.length > 0 && (
                <details className="mt-3 rounded-[var(--radius-sm)] border border-[var(--line)] px-3 py-2">
                  <summary className="cursor-pointer select-none text-xs font-bold text-[var(--ink-soft)]">
                    Historial de abonos ({sale.payments.length})
                  </summary>
                  <ul className="mt-2 divide-y divide-[var(--line)]">
                    {sale.payments.map((p) => (
                      <li key={p.id} className="flex justify-between gap-2 py-1.5 text-xs">
                        <span className="text-[var(--muted)]">{formatDateTime(p.created_at)}</span>
                        <span className="font-bold tabular-nums text-[var(--success)]">
                          +{formatMoney(p.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
