"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Calendar, Check, UserPlus, UserRound } from "lucide-react";
import { createCustomer, searchCustomers, type CustomerRow } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { formatMoney } from "@/lib/format";
import type { SaleCheckoutInitial } from "@/lib/sale-checkout-initial";
import {
  orderOptions,
  paymentOptions,
  saleBalance,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/sale-labels";

export type SaleOrderMetaPayload = {
  customerId: string | null;
  customerName: string | null;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  amountPaid?: number;
  deliveryDate: string | null;
};

export type SaleOrderMetaFormHandle = {
  validate: (subtotal: number) => string | null;
  getPayload: () => SaleOrderMetaPayload;
};

type Props = {
  initial?: SaleCheckoutInitial;
  subtotal: number;
};

export const SaleOrderMetaForm = forwardRef<SaleOrderMetaFormHandle, Props>(
  function SaleOrderMetaForm({ initial, subtotal }, ref) {
    const [customerQuery, setCustomerQuery] = useState("");
    const [customerHits, setCustomerHits] = useState<CustomerRow[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(
      initial?.customer ?? null
    );
    const [guestCustomerName, setGuestCustomerName] = useState(
      initial?.customer ? "" : (initial?.customerNameFallback ?? "")
    );
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");

    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
      initial?.paymentStatus ?? "paid"
    );
    const [orderStatus, setOrderStatus] = useState<OrderStatus>(initial?.orderStatus ?? "pending");
    const [abonoAmount, setAbonoAmount] = useState(() => {
      if (initial?.paymentStatus === "partial" && initial.amountPaid > 0) {
        return String(initial.amountPaid);
      }
      return "";
    });
    const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? "");

    const parsedAbono = useMemo(() => {
      const n = Number(String(abonoAmount).replace(/,/g, "."));
      return Number.isFinite(n) ? n : 0;
    }, [abonoAmount]);

    const saldo = useMemo(() => {
      if (paymentStatus === "paid") return 0;
      if (paymentStatus === "credit") return subtotal;
      return saleBalance(subtotal, parsedAbono);
    }, [paymentStatus, subtotal, parsedAbono]);

    const getPayload = useCallback((): SaleOrderMetaPayload => {
      return {
        customerId: selectedCustomer?.id ?? null,
        customerName: selectedCustomer?.name ?? (guestCustomerName.trim() || null),
        paymentStatus,
        orderStatus,
        amountPaid: paymentStatus === "partial" ? parsedAbono : undefined,
        deliveryDate: deliveryDate || null,
      };
    }, [
      selectedCustomer,
      guestCustomerName,
      paymentStatus,
      orderStatus,
      parsedAbono,
      deliveryDate,
    ]);

    const validate = useCallback(
      (total: number) => {
        if (paymentStatus === "partial") {
          if (parsedAbono <= 0) return "Indica cuánto abonó";
          if (parsedAbono >= total) return "El abono debe ser menor al total";
        }
        return null;
      },
      [paymentStatus, parsedAbono]
    );

    useImperativeHandle(ref, () => ({ validate, getPayload }), [validate, getPayload]);

    const loadCustomers = useCallback(async (q: string) => {
      try {
        setCustomerHits(await searchCustomers(q));
      } catch {
        setCustomerHits([]);
      }
    }, []);

    useEffect(() => {
      const t = setTimeout(() => loadCustomers(customerQuery), 280);
      return () => clearTimeout(t);
    }, [customerQuery, loadCustomers]);

    const saveNewCustomer = async () => {
      const result = await createCustomer({
        name: newCustomerName,
        phone: newCustomerPhone,
      });
      if (!result.ok) return result.error;
      setSelectedCustomer(result.customer);
      setShowNewCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      return null;
    };

    const paymentHint = paymentOptions.find((o) => o.value === paymentStatus)?.hint;

    return (
      <>
        <section className="card card-pad">
          <p className="eyebrow">Cliente</p>
          {selectedCustomer ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-white">
                  <UserRound className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[var(--ink)]">{selectedCustomer.name}</span>
                  <span className="block text-xs text-[var(--muted)]">Cliente registrado</span>
                </span>
              </span>
              <button
                type="button"
                className="link text-[13px]"
                onClick={() => setSelectedCustomer(null)}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <div className="mt-3">
                <SearchField
                  value={customerQuery}
                  onChange={setCustomerQuery}
                  placeholder="Buscar cliente registrado"
                  size="sm"
                />
              </div>
              {customerHits.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--line)] p-1">
                  {customerHits.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(c)}
                        className="block w-full rounded-[8px] px-3 py-2 text-left text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="my-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                <span className="h-px flex-1 bg-[var(--line)]" />
                o
                <span className="h-px flex-1 bg-[var(--line)]" />
              </div>

              <input
                value={guestCustomerName}
                onChange={(e) => setGuestCustomerName(e.target.value)}
                placeholder="Nombre del cliente (sin registrar)"
                className="field field-sm"
              />

              {!showNewCustomer ? (
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--line-strong)] text-[13px] font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                >
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Registrar cliente nuevo
                </button>
              ) : (
                <div className="mt-3 space-y-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-muted)]/50 p-3">
                  <p className="eyebrow">Nuevo cliente</p>
                  <input
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nombre *"
                    className="field field-sm"
                  />
                  <input
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="Teléfono"
                    inputMode="tel"
                    className="field field-sm"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => void saveNewCustomer()}>
                      <Check className="h-4 w-4" aria-hidden />
                      Guardar cliente
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewCustomer(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="card card-pad space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <p className="eyebrow">Pago</p>
              {paymentHint && <span className="text-xs text-[var(--muted)]">{paymentHint}</span>}
            </div>
            <div className="mt-2">
              <Segmented
                value={paymentStatus}
                onChange={setPaymentStatus}
                fill
                ariaLabel="Estado de pago"
                options={paymentOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
              />
            </div>
            {paymentStatus === "partial" && (
              <input
                value={abonoAmount}
                onChange={(e) => setAbonoAmount(e.target.value)}
                placeholder="Monto abonado"
                inputMode="decimal"
                className="field mt-2 tabular-nums"
              />
            )}
            {paymentStatus !== "paid" && (
              <div className="mt-2 flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--danger-bg)] px-3 py-2 text-sm">
                <span className="font-semibold text-[var(--danger)]">Saldo pendiente</span>
                <span className="font-bold tabular-nums text-[var(--danger)]">{formatMoney(saldo)}</span>
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow">Fecha de entrega</p>
            <label className="relative mt-2 block">
              <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" aria-hidden />
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="field pl-10"
              />
            </label>
            <p className="mt-1.5 text-xs text-[var(--muted)]">Opcional · útil para el tablero de pedidos.</p>
          </div>

          <div>
            <p className="eyebrow">Estado del pedido</p>
            <div className="mt-2">
              <Segmented
                value={orderStatus}
                onChange={setOrderStatus}
                fill
                ariaLabel="Estado del pedido"
                options={orderOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
              />
            </div>
          </div>
        </section>
      </>
    );
  }
);
