import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export function Notice({
  tone = "danger",
  children,
  className,
}: {
  tone?: "danger" | "success" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const styles =
    tone === "danger"
      ? "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger)]"
      : tone === "success"
        ? "border-[var(--success-line)] bg-[var(--success-bg)] text-[var(--success)]"
        : "border-[var(--info-line)] bg-[var(--info-bg)] text-[var(--info)]";
  const Icon = tone === "danger" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3.5 py-3 text-sm leading-relaxed ${styles} ${className ?? ""}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
