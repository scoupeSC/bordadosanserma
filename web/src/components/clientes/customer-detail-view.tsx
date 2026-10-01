"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Banknote,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Plus,
  Receipt,
} from "lucide-react";
import type { CustomerDetail, CustomerSaleSummary } from "@/app/actions/customers";
import { registerSalePayment } from "@/app/actions/payments";
import { Button, LinkButton } from "@/components/ui/button";
import { Chip, orderTone, paymentTone } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatDateTime, formatDeliveryDate, formatMoney } from "@/lib/format";
import { orderLabel, paymentLabel, saleBalance } from "@/lib/sale-labels";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export function CustomerDetailView({ initial }: { initial: CustomerDetail }) {
  const [sales, setSales] = useState(initial.sales);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    let totalPurchased = 0;
    let totalPaid = 0;
    let balanceDue = 0;
    for (const s of sales) {
      totalPurchased += s.total;
      totalPaid += s.amount_paid;
      balanceDue += s.balance;
    }
    return {
      salesCount: sales.length,
      totalPurchased,
      totalPaid,
      balanceDue,
    };
  }, [sales]);

  const salesWithBalance = useMemo(() => sales.filter((s) => s.balance > 0), [sales]);

  const submitPayment = (sale: CustomerSaleSummary) => {
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

  const payFull = (sale: CustomerSaleSummary) => {
    setAmounts((a) => ({ ...a, [sale.id]: String(sale.balance) }));
  };

  const { customer } = initial;

  return (
    <div className="space-y-4 pb-8">
      <section className="card card-pad">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] font-mono text-sm font-bold text-white">
              {initials(customer.name)}
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">{customer.name}</h2>
              <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ink-soft)]">
                {customer.phone && (
                  <li className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
                    {customer.phone}
                  </li>
                )}
                {customer.email && (
                  <li className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
                    <span className="break-all">{customer.email}</span>
                  </li>
                )}
                {!customer.phone && !customer.email && (
                  <li className="text-[var(--muted)]">Sin teléfono ni correo</li>
                )}
              </ul>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <LinkButton href={`/clientes/${customer.id}/editar`} variant="secondary" size="sm">
              Editar
            </LinkButton>
            <LinkButton href={`/ventas/nueva?cliente=${customer.id}`} variant="accent" size="sm">
              <Plus className="h-4 w-4" />
              Nueva venta
            </LinkButton>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <StatCard label="Ventas" value={String(stats.salesCount)} />
        <StatCard label="Total comprado" value={formatMoney(stats.totalPurchased)} tone="accent" />
        <StatCard label="Total abonado" value={formatMoney(stats.totalPaid)} tone="good" />
        <StatCard
          label="Saldo pendiente"
          value={formatMoney(stats.balanceDue)}
          tone={stats.balanceDue > 0 ? "danger" : "default"}
        />
      </div>

      {error && <Notice>{error}</Notice>}

      {salesWithBalance.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">Pedidos con saldo</h2>
            <p className="text-[13px] text-[var(--muted)]">Registra abonos sin salir del perfil</p>
          </div>
          <ul className="space-y-3">
            {salesWithBalance.map((sale) => {
              const open = expanded === sale.id;
              const pct = sale.total > 0 ? Math.min(100, Math.round((sale.amount_paid / sale.total) * 100)) : 0;
              return (
                <li key={sale.id} className={`card card-pad ${open ? "shadow-[var(--shadow-hover)]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold tracking-tight text-[var(--ink)]">
                        Pedido · {formatDate(sale.created_at)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                        Total{" "}
                        <span className="font-semibold tabular-nums text-[var(--ink)]">{formatMoney(sale.total)}</span>
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
                    <Link href={`/ventas/${sale.id}/editar`} className="link text-[13px]">
                      Ver venta
                    </Link>
                    <Link href="/pagos" className="ml-auto text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
                      Ir a Pagos
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
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">Historial de ventas</h2>
        {sales.length === 0 ? (
          <EmptyState
            compact
            icon={Receipt}
            title="Sin ventas vinculadas"
            description="Al registrar una venta, elige este cliente en el checkout (no solo el nombre suelto)."
          />
        ) : (
          <ul className="card divide-y divide-[var(--line)] overflow-hidden">
            {sales.map((sale) => (
              <li key={sale.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--ink)]">{formatDate(sale.created_at)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Chip tone={paymentTone(sale.payment_status)}>{paymentLabel(sale.payment_status)}</Chip>
                    <Chip tone={orderTone(sale.order_status)}>{orderLabel(sale.order_status)}</Chip>
                  </div>
                  {sale.payments.length > 0 && (
                    <details className="mt-2 text-xs text-[var(--muted)]">
                      <summary className="cursor-pointer select-none font-bold text-[var(--ink-soft)]">
                        Abonos ({sale.payments.length})
                      </summary>
                      <ul className="mt-1 space-y-0.5">
                        {sale.payments.map((p) => (
                          <li key={p.id} className="flex justify-between gap-2">
                            <span>{formatDateTime(p.created_at)}</span>
                            <span className="font-bold tabular-nums text-[var(--success)]">
                              +{formatMoney(p.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold tabular-nums text-[var(--ink)]">{formatMoney(sale.total)}</p>
                  {sale.balance > 0 && (
                    <p className="text-xs font-bold tabular-nums text-[var(--danger)]">
                      Debe {formatMoney(sale.balance)}
                    </p>
                  )}
                  <Link href={`/ventas/${sale.id}/editar`} className="link mt-1 inline-block text-xs">
                    Ver venta
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
