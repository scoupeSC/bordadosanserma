"use client";

import { useCallback, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, Loader2 } from "lucide-react";
import { getFinanceDashboard, type FinanceDashboardData } from "@/app/actions/finances";
import { DateRangeFields } from "@/components/ui/date-range-fields";
import { Segmented } from "@/components/ui/segmented";
import { StatCard } from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/format";
import { defaultCustomRangeKeys, type FinancePreset } from "@/lib/finance-period";

const quickPresets: { id: Exclude<FinancePreset, "custom">; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Año" },
];

const CHART_INK = "#0f1115";
const CHART_ACCENT = "#3556ff";
const CHART_DANGER = "#d1281f";
const CHART_GOOD = "#15803d";
const CHART_GRID = "rgba(15,17,21,0.08)";
const CHART_TICK = "#6d7280";

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid rgba(15,17,21,0.08)",
  boxShadow: "0 8px 24px rgba(15,17,21,0.10)",
  padding: "8px 12px",
};

export function FinanceDashboard({ initial }: { initial: FinanceDashboardData }) {
  const defaults = defaultCustomRangeKeys();
  const [data, setData] = useState(initial);
  const [activePreset, setActivePreset] = useState<FinancePreset>("7d");
  const [rangeFrom, setRangeFrom] = useState(defaults.from);
  const [rangeTo, setRangeTo] = useState(defaults.to);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = useCallback(
    (p: FinancePreset, from?: string, to?: string) => {
      startTransition(async () => {
        try {
          const next = await getFinanceDashboard({
            preset: p,
            customFrom: from,
            customTo: to,
          });
          setData(next);
          setRangeError(null);
        } catch (e) {
          setRangeError(e instanceof Error ? e.message : "No se pudo cargar el periodo");
        }
      });
    },
    []
  );

  const selectQuick = (id: Exclude<FinancePreset, "custom">) => {
    setCustomOpen(false);
    setActivePreset(id);
    load(id);
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

  const chartData = data.series.map((s) => ({
    name: s.label,
    Ventas: s.revenue,
    Gastos: s.expenses,
    Utilidad: s.profit,
    Pedidos: s.orders,
  }));

  const topData = data.topProducts.map((p) => ({
    name: p.name.length > 22 ? `${p.name.slice(0, 22)}…` : p.name,
    fullName: p.name,
    Unidades: p.quantity,
    Ingresos: p.revenue,
  }));

  const showCustom = customOpen || activePreset === "custom";
  const segValue: FinancePreset = showCustom ? "custom" : activePreset;
  const grainLabel =
    data.grain === "hour"
      ? "por hora"
      : data.grain === "day"
        ? "por día"
        : data.grain === "week"
          ? "por semana"
          : "por mes";

  return (
    <div className="space-y-4 pb-8">
      <section className="card card-pad space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented<FinancePreset>
            value={segValue}
            onChange={(v) => {
              if (v === "custom") {
                setCustomOpen(true);
                return;
              }
              selectQuick(v);
            }}
            options={[
              ...quickPresets.map((p) => ({ value: p.id, label: p.label })),
              { value: "custom", label: "Rango" },
            ]}
            fill
            ariaLabel="Periodo"
            className="sm:w-auto sm:min-w-[380px]"
          />
          <p className="flex items-center gap-1.5 text-[13px] text-[var(--muted)]">
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span className="font-semibold text-[var(--ink)]">{data.rangeLabel}</span>
            <span aria-hidden>·</span>
            <span>Vista {grainLabel}</span>
          </p>
        </div>

        {showCustom && (
          <DateRangeFields
            from={rangeFrom}
            to={rangeTo}
            onFromChange={setRangeFrom}
            onToChange={setRangeTo}
            onApply={applyCustomRange}
            active={activePreset === "custom"}
            pending={pending}
            error={rangeError}
            applyLabel="Aplicar rango"
          />
        )}
        {!showCustom && rangeError && (
          <p className="text-xs font-medium text-[var(--danger)]">{rangeError}</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:gap-3 2xl:grid-cols-6">
        <StatCard label="Ventas" value={formatMoney(data.summary.revenue)} tone="accent" />
        <StatCard label="Gastos" value={formatMoney(data.summary.expenses)} tone="bad" />
        <StatCard
          label="Utilidad"
          value={formatMoney(data.summary.profit)}
          tone={data.summary.profit >= 0 ? "good" : "bad"}
        />
        <StatCard label="Pedidos" value={String(data.summary.orders)} />
        <StatCard label="Unidades" value={String(data.summary.unitsSold)} />
        <StatCard label="Ticket prom." value={formatMoney(data.summary.avgTicket)} />
      </div>

      <section className="card card-pad">
        <header>
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">Ventas vs gastos</h2>
          <p className="text-[13px] text-[var(--muted)]">Comparativo en el periodo seleccionado</p>
        </header>
        <div className="mt-4 h-64 w-full min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: CHART_TICK }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_TICK }}
                width={44}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(value) => formatMoney(Number(value ?? 0))}
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(15,17,21,0.04)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <Bar dataKey="Ventas" fill={CHART_ACCENT} radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Gastos" fill={CHART_DANGER} radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Line
                type="monotone"
                dataKey="Utilidad"
                stroke={CHART_GOOD}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: CHART_GOOD, stroke: "#fff", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card card-pad">
        <header>
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">Productos más vendidos</h2>
          <p className="text-[13px] text-[var(--muted)]">Por unidades en el periodo</p>
        </header>
        {topData.length === 0 ? (
          <p className="mt-6 rounded-[var(--radius-sm)] border border-dashed border-[var(--line-strong)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            Sin ventas en este rango.
          </p>
        ) : (
          <div className="mt-4 h-72 w-full min-w-0 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11, fill: CHART_INK }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === "Ingresos" ? formatMoney(Number(value ?? 0)) : Number(value ?? 0)
                  }
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(15,17,21,0.04)" }}
                />
                <Bar dataKey="Unidades" fill={CHART_INK} radius={[0, 6, 6, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <ul className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)] lg:hidden">
          {data.topProducts.map((p) => (
            <li key={p.productId} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
              <span className="truncate font-semibold text-[var(--ink)]">{p.name}</span>
              <span className="shrink-0 tabular-nums text-[var(--muted)]">
                <span className="font-mono font-bold text-[var(--ink)]">{p.quantity}</span> u ·{" "}
                {formatMoney(p.revenue)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
