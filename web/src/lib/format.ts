const BOGOTA_TZ = "America/Bogota";

const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

function partsInBogota(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return map;
}

/** Misma salida en servidor y navegador (evita errores de hidratación). */
export function formatDateTime(value: string) {
  const p = partsInBogota(value);
  if (!p?.day || !p.month || !p.hour || !p.minute) return "—";
  const month = MONTHS_SHORT[Number(p.month) - 1] ?? p.month;
  const hour = p.hour.padStart(2, "0");
  const period = p.dayPeriod?.toUpperCase() === "AM" ? "a. m." : "p. m.";
  return `${p.day} ${month}, ${hour}:${p.minute} ${period}`;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  const p = partsInBogota(value);
  if (!p?.day || !p.month || !p.year) return "—";
  const month = MONTHS_SHORT[Number(p.month) - 1] ?? p.month;
  return `${p.day} ${month} ${p.year}`;
}

/** Fecha YYYY-MM-DD sin desfase por zona horaria */
export function formatDeliveryDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  const month = MONTHS_SHORT[m - 1] ?? String(m);
  return `${d} ${month} ${y}`;
}
