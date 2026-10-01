"use client";

import { X } from "lucide-react";

type DialogProps = {
  onClose: () => void;
  children: React.ReactNode;
  /** `sheet`: hoja inferior en móvil, centrado en desktop. `center`: siempre centrado. */
  mode?: "sheet" | "center";
  size?: "sm" | "md" | "lg";
  className?: string;
  labelledBy?: string;
  ariaLabel?: string;
};

const sizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
} as const;

export function Dialog({
  onClose,
  children,
  mode = "sheet",
  size = "md",
  className,
  labelledBy,
  ariaLabel,
}: DialogProps) {
  const align = mode === "sheet" ? "items-end sm:items-center" : "items-center";
  const shape =
    mode === "sheet"
      ? "rounded-t-[22px] sm:rounded-[var(--radius)]"
      : "rounded-[var(--radius)]";

  return (
    <div
      className={`fixed inset-0 z-50 flex ${align} justify-center bg-[var(--overlay)] p-0 animate-fade sm:p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full ${sizes[size]} ${shape} max-h-[92dvh] overflow-y-auto bg-[var(--surface)] shadow-[var(--shadow-pop)] ${
          mode === "sheet" ? "animate-rise sm:animate-pop" : "animate-pop"
        } ${mode === "center" ? "mx-4 sm:mx-0" : ""} ${className ?? ""}`}
      >
        {mode === "sheet" && (
          <span className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-[var(--line-strong)] sm:hidden" aria-hidden />
        )}
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  title,
  description,
  onClose,
  id,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  onClose?: () => void;
  id?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 sm:pt-5">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-bold tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        )}
        {children}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="icon-btn -mr-1.5" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className ?? ""}`}>{children}</div>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 sm:flex-row sm:justify-end sm:pb-5">
      {children}
    </div>
  );
}
