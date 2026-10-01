export type FinancePreset = "today" | "7d" | "month" | "year" | "custom";

export type FinanceGrain = "hour" | "day" | "week" | "month";

export type FinanceRange = {
  preset: FinancePreset;
  from: string;
  to: string;
  grain: FinanceGrain;
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

export function bogotaDateKey(d: Date): string {
  const p = bogotaParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
}

function startOfDayBogota(d: Date): Date {
  const key = bogotaDateKey(d);
  return parseDateKey(key);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function endOfDayExclusive(d: Date) {
  return addDays(startOfDayBogota(d), 1);
}

export function resolveFinanceRange(
  preset: FinancePreset,
  customFrom?: string,
  customTo?: string
): FinanceRange {
  const now = new Date();

  if (preset === "today") {
    const from = startOfDayBogota(now);
    const to = endOfDayExclusive(now);
    return {
      preset,
      from: from.toISOString(),
      to: to.toISOString(),
      grain: "hour",
      label: "Hoy",
    };
  }

  if (preset === "7d") {
    const to = endOfDayExclusive(now);
    const from = addDays(startOfDayBogota(now), -6);
    return {
      preset,
      from: from.toISOString(),
      to: to.toISOString(),
      grain: "day",
      label: "Últimos 7 días",
    };
  }

  if (preset === "month") {
    const p = bogotaParts(now);
    const from = parseDateKey(`${p.year}-${p.month}-01`);
    const to = endOfDayExclusive(now);
    return {
      preset,
      from: from.toISOString(),
      to: to.toISOString(),
      grain: "day",
      label: "Este mes",
    };
  }

  if (preset === "year") {
    const p = bogotaParts(now);
    const from = parseDateKey(`${p.year}-01-01`);
    const to = endOfDayExclusive(now);
    return {
      preset,
      from: from.toISOString(),
      to: to.toISOString(),
      grain: "month",
      label: `Año ${p.year}`,
    };
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
  const daySpan = Math.round((to.getTime() - from.getTime()) / 86400000);
  let grain: FinanceGrain = "day";
  if (daySpan <= 2) grain = "hour";
  else if (daySpan > 120) grain = "month";
  else if (daySpan > 45) grain = "week";

  return {
    preset: "custom",
    from: from.toISOString(),
    to: to.toISOString(),
    grain,
    label: `Del ${formatDateKeyLabel(fromKey)} al ${formatDateKeyLabel(toKey)}`,
  };
}

export function defaultCustomRangeKeys(): { from: string; to: string } {
  const now = new Date();
  return {
    from: bogotaDateKey(addDays(startOfDayBogota(now), -6)),
    to: bogotaDateKey(now),
  };
}

function formatDateKeyLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${months[m - 1] ?? m} ${y}`;
}

export function bucketKeyForDate(iso: string, grain: FinanceGrain): string {
  const d = new Date(iso);
  const p = bogotaParts(d);
  if (grain === "hour") return `${p.year}-${p.month}-${p.day} ${p.hour}:00`;
  if (grain === "day") return `${p.year}-${p.month}-${p.day}`;
  if (grain === "month") return `${p.year}-${p.month}`;
  const day = parseDateKey(`${p.year}-${p.month}-${p.day}`);
  const start = startOfDayBogota(day);
  const weekStart = addDays(start, -((start.getUTCDay() + 6) % 7));
  return bogotaDateKey(weekStart);
}

export function formatBucketLabel(key: string, grain: FinanceGrain): string {
  if (grain === "hour") {
    const [date, time] = key.split(" ");
    const [, m, d] = date.split("-");
    return `${d}/${m} ${time?.replace(":00", "h") ?? ""}`.trim();
  }
  if (grain === "day") {
    const [, m, d] = key.split("-");
    return `${d}/${m}`;
  }
  if (grain === "month") {
    const [y, m] = key.split("-");
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${months[Number(m) - 1] ?? m} ${y}`;
  }
  const [, m, d] = key.split("-");
  return `Sem ${d}/${m}`;
}

export function buildBucketSeries(
  fromIso: string,
  toIso: string,
  grain: FinanceGrain
): string[] {
  const keys: string[] = [];
  let cursor = new Date(fromIso);
  const end = new Date(toIso);
  const stepMs =
    grain === "hour"
      ? 3600000
      : grain === "day"
        ? 86400000
        : grain === "week"
          ? 7 * 86400000
          : 30 * 86400000;

  while (cursor < end && keys.length < 400) {
    keys.push(bucketKeyForDate(cursor.toISOString(), grain));
    cursor = new Date(cursor.getTime() + stepMs);
  }
  return [...new Set(keys)];
}
