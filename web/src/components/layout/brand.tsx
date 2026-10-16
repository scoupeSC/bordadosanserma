import Image from "next/image";
import Link from "next/link";

const LOGO = "/icons/logo-bordado.png";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const px = size === "sm" ? 32 : 36;
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black ${
        size === "sm" ? "h-8 w-8" : "h-9 w-9"
      }`}
      aria-hidden
    >
      <Image src={LOGO} alt="" width={px} height={px} className="h-full w-full object-contain" />
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-ring)] rounded-lg">
      <BrandMark size={compact ? "sm" : "md"} />
      <span className="min-w-0 leading-none">
        <span className="block text-[13px] font-bold tracking-tight text-[var(--ink)] sm:text-[14px]">
          BORDADOS ANSERMA
        </span>
        {!compact && (
          <span className="mt-1 block text-[11px] font-medium text-[var(--muted)]">
            Ventas e inventario
          </span>
        )}
      </span>
    </Link>
  );
}
