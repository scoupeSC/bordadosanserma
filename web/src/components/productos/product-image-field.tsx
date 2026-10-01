"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { validateProductImageFile } from "@/lib/product-image";

type Props = {
  existingUrl?: string | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onClearExisting: () => void;
  clearExisting: boolean;
};

export function ProductImageField({
  existingUrl,
  disabled,
  onChange,
  onClearExisting,
  clearExisting,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const displayUrl = preview ?? (!clearExisting ? existingUrl : null);

  const pickFile = (file: File | null) => {
    setLocalError(null);
    if (!file) {
      onChange(null);
      setPreview(null);
      return;
    }
    const check = validateProductImageFile(file);
    if (!check.ok) {
      setLocalError(check.error);
      onChange(null);
      setPreview(null);
      return;
    }
    onChange(file);
    setPreview(URL.createObjectURL(file));
  };

  const remove = () => {
    setLocalError(null);
    onChange(null);
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    if (existingUrl) onClearExisting();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="md:col-span-2">
      <span className="label">Foto del producto</span>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Opcional · se muestra en el catálogo de ventas · JPG, PNG o WebP hasta 5 MB.
      </p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={`group relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-[14px] transition-colors sm:h-32 sm:w-32 ${
            displayUrl
              ? "ring-1 ring-[var(--line)]"
              : "border border-dashed border-[var(--line-strong)] bg-[var(--surface-muted)]/60 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          } focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-ring)]`}
          aria-label={displayUrl ? "Cambiar imagen" : "Subir imagen"}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-[var(--muted)] group-hover:text-[var(--accent)]">
              <ImagePlus className="h-6 w-6" aria-hidden />
              <span className="text-xs font-semibold">Subir foto</span>
            </span>
          )}
        </button>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 items-center rounded-[var(--radius-xs)] border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-50"
          >
            {displayUrl ? "Cambiar imagen" : "Elegir archivo"}
          </button>
          {displayUrl && (
            <button
              type="button"
              disabled={disabled}
              onClick={remove}
              className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-xs)] px-3 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Quitar
            </button>
          )}
        </div>
      </div>

      {localError && <p className="mt-2 text-xs font-medium text-[var(--danger)]">{localError}</p>}
    </div>
  );
}
