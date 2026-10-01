"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import type { CustomerListRow } from "@/app/actions/customers";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { formatMoney } from "@/lib/format";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export function CustomerList({ initialCustomers }: { initialCustomers: CustomerListRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialCustomers;
    return initialCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
    );
  }, [initialCustomers, query]);

  const totalDue = useMemo(
    () => initialCustomers.reduce((acc, c) => acc + c.balanceDue, 0),
    [initialCustomers]
  );

  if (initialCustomers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aún no hay clientes"
        description="Créalos aquí o se guardan automáticamente al hacer una venta."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="card card-pad space-y-3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre, teléfono o correo…"
        />
        <p className="text-[13px] text-[var(--muted)]">
          <span className="font-bold text-[var(--ink)]">{filtered.length}</span> cliente(s)
          {totalDue > 0 && (
            <>
              {" "}
              · Saldo pendiente total{" "}
              <span className="font-bold tabular-nums text-[var(--danger)]">
                {formatMoney(totalDue)}
              </span>
            </>
          )}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState compact title="Sin resultados" description="Prueba con otro nombre o teléfono." />
      ) : (
        <ul className="card divide-y divide-[var(--line)] overflow-hidden">
          {filtered.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/clientes/${customer.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-muted)] active:bg-[var(--surface-muted)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] font-mono text-xs font-bold text-[var(--ink-soft)] ring-1 ring-[var(--line)]">
                  {initials(customer.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold tracking-tight text-[var(--ink)]">
                    {customer.name}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {[customer.phone, customer.email].filter(Boolean).join(" · ") || "Sin contacto"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    {customer.salesCount} venta(s) · {formatMoney(customer.totalPurchased)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {customer.balanceDue > 0 ? (
                    <Chip tone="danger">Debe {formatMoney(customer.balanceDue)}</Chip>
                  ) : (
                    <Chip tone="success">Al día</Chip>
                  )}
                  <ChevronRight className="h-4 w-4 text-[var(--faint)]" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
