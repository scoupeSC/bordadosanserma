import {
  bogotaDateKey,
  defaultCustomRangeKeys,
  parseDateKey,
} from "@/lib/finance-period";

export type SalesDatePreset = "today" | "yesterday" | "7d" | "month" | "custom";

export type SalesDateRange = {
  preset: SalesDatePreset;
  from: string;
  to: string;
  label: string;
};

const TZ = "America/Bogota";

function bogotaParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return map;
}

function startOfDayBogota(d: Date): Date {
  return parseDateKey(bogotaDateKey(d));
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function endOfDayExclusive(d: Date) {
  return addDays(startOfDayBogota(d), 1);
}

function formatDateKeyLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${months[m - 1] ?? m} ${y}`;
}

export { defaultCustomRangeKeys };

export function resolveSalesDateRange(
  preset: SalesDatePreset,
  customFrom?: string,
  customTo?: string
): SalesDateRange {
  const now = new Date();

  if (preset === "today") {
    const from = startOfDayBogota(now);
    const to = endOfDayExclusive(now);
    return { preset, from: from.toISOString(), to: to.toISOString(), label: "Hoy" };
  }

  if (preset === "yesterday") {
    const y = addDays(startOfDayBogota(now), -1);
    const from = startOfDayBogota(y);
    const to = endOfDayExclusive(y);
    return { preset, from: from.toISOString(), to: to.toISOString(), label: "Ayer" };
  }

  if (preset === "7d") {
    const to = endOfDayExclusive(now);
    const from = addDays(startOfDayBogota(now), -6);
    return {
      preset,
      from: from.toISOString(),
      to: to.toISOString(),
      label: "Últimos 7 días",
    };
  }

  if (preset === "month") {
    const p = bogotaParts(now);
    const from = parseDateKey(`${p.year}-${p.month}-01`);
    const to = endOfDayExclusive(now);
    return { preset, from: from.toISOString(), to: to.toISOString(), label: "Este mes" };
  }

  const fromKey = customFrom?.trim();
  const toKey = customTo?.trim();
  if (!fromKey || !toKey) {
    throw new Error("Selecciona fecha inicial y final");
  }
  if (fromKey > toKey) {
    throw new Error("La fecha inicial no puede ser posterior a la final");
  }

  const from = parseDateKey(fromKey);
  const to = addDays(parseDateKey(toKey), 1);
  return {
    preset: "custom",
    from: from.toISOString(),
    to: to.toISOString(),
    label: `Del ${formatDateKeyLabel(fromKey)} al ${formatDateKeyLabel(toKey)}`,
  };
}
