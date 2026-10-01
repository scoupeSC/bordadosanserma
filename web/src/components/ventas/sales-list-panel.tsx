"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { listSales, type ListSalesResult } from "@/app/actions/sales";
import { SalesList } from "@/components/ventas/sales-list";
import { DateRangeFields } from "@/components/ui/date-range-fields";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { formatMoney } from "@/lib/format";
import { defaultCustomRangeKeys, type SalesDatePreset } from "@/lib/sales-period";

const quickPresets: { id: Exclude<SalesDatePreset, "custom">; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
  { id: "7d", label: "7 días" },
  { id: "month", label: "Mes" },
];

type Props = {
  initial: ListSalesResult;
  initialPreset?: SalesDatePreset;
};

export function SalesListPanel({ initial, initialPreset = "7d" }: Props) {
  const defaults = defaultCustomRangeKeys();
  const [result, setResult] = useState(initial);
  const [activePreset, setActivePreset] = useState<SalesDatePreset>(initialPreset);
  const [customerQuery, setCustomerQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [rangeFrom, setRangeFrom] = useState(defaults.from);
  const [rangeTo, setRangeTo] = useState(defaults.to);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const skippedInitialFetch = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(customerQuery.trim()), 280);
    return () => clearTimeout(t);
  }, [customerQuery]);

  const load = useCallback(
    (preset: SalesDatePreset, customFrom?: string, customTo?: string, query?: string) => {
      startTransition(async () => {
        try {
          const next = await listSales({
            preset,
            customFrom,
            customTo,
            customerQuery: query ?? debouncedQuery,
          });
          setResult(next);
          setRangeError(null);
        } catch (e) {
          setRangeError(e instanceof Error ? e.message : "No se pudo cargar las ventas");
        }
      });
    },
    [debouncedQuery]
  );

  useEffect(() => {
    if (activePreset === "custom") return;
    if (
      !skippedInitialFetch.current &&
      debouncedQuery === "" &&
      activePreset === initialPreset
    ) {
      skippedInitialFetch.current = true;
      return;
    }
    load(activePreset);
  }, [debouncedQuery, activePreset, initialPreset, load]);

  const selectQuick = (id: Exclude<SalesDatePreset, "custom">) => {
    setActivePreset(id);
  };

  const applyCustomRange = () => {
    setRangeError(null);
    if (!rangeFrom || !rangeTo) {
      setRangeError("Elige la fecha inicial y la final");
      return;
    }
    if (rangeFrom > rangeTo) {
      setRangeError("La fecha inicial no puede ser después de la final");
      return;
    }
    setActivePreset("custom");
    load("custom", rangeFrom, rangeTo);
  };

  type PresetKey = Exclude<SalesDatePreset, "custom"> | "custom";
  const segmentedValue: PresetKey = customOpen ? "custom" : activePreset;

  return (
    <div className="space-y-4">
      <section className="card card-pad space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            value={customerQuery}
            onChange={setCustomerQuery}
            placeholder="Buscar por nombre de cliente…"
            className="min-w-0 flex-1"
          />
          <div className="flex items-center gap-2">
            <Segmented<PresetKey>
              value={segmentedValue}
              onChange={(v) => {
                if (v === "custom") {
                  setCustomOpen(true);
                  return;
                }
                setCustomOpen(false);
                selectQuick(v);
              }}
              ariaLabel="Fecha de venta"
              options={[
                ...quickPresets.map((p) => ({ value: p.id as PresetKey, label: p.label })),
                {
                  value: "custom" as PresetKey,
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                      Rango
                    </span>
                  ),
                },
              ]}
            />
            {pending && <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" aria-label="Cargando" />}
          </div>
        </div>

        {(customOpen || activePreset === "custom") && (
          <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface-muted)]/50 p-3 animate-fade">
            <DateRangeFields
              from={rangeFrom}
              to={rangeTo}
              onFromChange={setRangeFrom}
              onToChange={setRangeTo}
              onApply={applyCustomRange}
              active={activePreset === "custom"}
              pending={pending}
              error={rangeError}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--line)] pt-3 text-[13px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {result.rangeLabel}
          </span>
          <span>
            <span className="font-bold text-[var(--ink)]">{result.sales.length}</span> venta(s)
          </span>
          <span className="ml-auto">
            Total{" "}
            <span className="font-bold tabular-nums text-[var(--ink)]">{formatMoney(result.totalAmount)}</span>
          </span>
        </div>
      </section>

      <SalesList
        sales={result.sales}
        emptyMessage={
          debouncedQuery
            ? "No hay ventas de ese cliente en el periodo seleccionado."
            : "No hay ventas en el periodo seleccionado."
        }
      />
    </div>
  );
}
