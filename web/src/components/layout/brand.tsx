import Link from "next/link";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-8 w-8 rounded-[9px] text-[15px]" : "h-9 w-9 rounded-[10px] text-base";
  return (
    <span
      className={`relative flex ${box} shrink-0 items-center justify-center bg-[var(--ink)] font-bold text-white`}
      aria-hidden
    >
      H
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)]" />
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-ring)] rounded-lg">
      <BrandMark size={compact ? "sm" : "md"} />
      <span className="min-w-0 leading-none">
        <span className="block text-[15px] font-bold tracking-tight text-[var(--ink)]">Hader</span>
        {!compact && (
          <span className="mt-1 block text-[11px] font-medium text-[var(--muted)]">
            Ventas e inventario
          </span>
        )}
      </span>
    </Link>
  );
}
