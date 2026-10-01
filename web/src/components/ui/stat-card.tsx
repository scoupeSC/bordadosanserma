export function StatCard({
  label,
  value,
  tone = "default",
  hint,
  className,
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad" | "accent" | "danger";
  hint?: string;
  className?: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-[var(--success)]"
      : tone === "bad" || tone === "danger"
        ? "text-[var(--danger)]"
        : tone === "accent"
          ? "text-[var(--accent)]"
          : "text-[var(--ink)]";

  return (
    <article className={`card px-4 py-3.5 sm:px-5 sm:py-4 ${className ?? ""}`}>
      <p className="eyebrow truncate">{label}</p>
      <p
        className={`mt-1.5 break-words text-[19px] font-bold leading-tight tabular-nums tracking-tight sm:text-[22px] xl:text-[24px] ${toneClass}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </article>
  );
}
