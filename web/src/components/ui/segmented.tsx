"use client";

type Option<T extends string> = {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
};

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  fill = false,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  /** Ocupa todo el ancho, columnas iguales */
  fill?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`seg ${fill ? "seg-fill" : ""} ${className ?? ""}`}
      style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={on}
            data-on={on ? "true" : "false"}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className="seg-btn disabled:opacity-40"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
