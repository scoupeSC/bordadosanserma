import type { OrderStatus, PaymentStatus } from "@/lib/sale-labels";

export type ChipTone = "muted" | "accent" | "success" | "info" | "warn" | "danger" | "ink";

const tones: Record<ChipTone, string> = {
  muted: "bg-[var(--surface-muted)] text-[var(--ink-soft)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
  success: "bg-[var(--success-bg)] text-[var(--success)]",
  info: "bg-[var(--info-bg)] text-[var(--info)]",
  warn: "bg-[var(--warn-bg)] text-[var(--warn)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)]",
  ink: "bg-[var(--ink)] text-white",
};

export function Chip({
  tone = "muted",
  dot = false,
  className,
  children,
}: {
  tone?: ChipTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`chip ${dot ? "chip-dot" : ""} ${tones[tone]} ${className ?? ""}`}>{children}</span>
  );
}

export function orderTone(status: OrderStatus): ChipTone {
  if (status === "pending") return "warn";
  if (status === "ready") return "info";
  return "success";
}

export function paymentTone(status: PaymentStatus): ChipTone {
  if (status === "paid") return "success";
  if (status === "partial") return "warn";
  return "danger";
}
