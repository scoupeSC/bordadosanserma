"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createAttributeGroup,
  createAttributeOption,
  deleteAttributeGroup,
  deleteAttributeOption,
  updateAttributeGroup,
  updateAttributeOption,
} from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { AttributeGroup } from "@/lib/types";

type Props = {
  catalog: AttributeGroup[];
  selected: Set<string>;
  onToggleOption: (optionId: string) => void;
  onOptionRemoved: (optionId: string) => void;
  onGroupRemoved: (groupId: string, optionIds: string[]) => void;
  disabled?: boolean;
};

export function TagCatalogManager({
  catalog,
  selected,
  onToggleOption,
  onOptionRemoved,
  onGroupRemoved,
  disabled,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newOptionByGroup, setNewOptionByGroup] = useState<Record<string, string>>({});

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editOptionLabel, setEditOptionLabel] = useState("");

  const busy = disabled || pending;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "No se pudo completar la acción");
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {error && <Notice>{error}</Notice>}

      {catalog.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          Aún no hay categorías. Crea una abajo (ej. <span className="font-semibold text-[var(--ink)]">Color</span> o{" "}
          <span className="font-semibold text-[var(--ink)]">Talla</span>).
        </p>
      )}

      {catalog.map((group) => (
        <section key={group.id} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {editingGroupId === group.id ? (
              <div className="flex min-w-0 flex-1 gap-2">
                <input
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="field field-sm min-w-0 flex-1 font-semibold"
                  aria-label="Nombre de categoría"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-10"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => updateAttributeGroup(group.id, editGroupName),
                      () => setEditingGroupId(null)
                    )
                  }
                >
                  Listo
                </Button>
                <button
                  type="button"
                  className="icon-btn h-10 w-10"
                  onClick={() => setEditingGroupId(null)}
                  aria-label="Cancelar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <h3 className="eyebrow text-[var(--ink)]">{group.name}</h3>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    disabled={busy}
                    title="Renombrar categoría"
                    onClick={() => {
                      setEditingGroupId(group.id);
                      setEditGroupName(group.name);
                    }}
                    className="icon-btn h-8 w-8"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    title="Eliminar categoría"
                    onClick={() =>
                      run(
                        () => deleteAttributeGroup(group.id),
                        () =>
                          onGroupRemoved(
                            group.id,
                            group.options.map((o) => o.id)
                          )
                      )
                    }
                    className="icon-btn h-8 w-8 hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {group.options.map((opt) => {
              if (editingOptionId === opt.id) {
                return (
                  <div key={opt.id} className="flex w-full max-w-xs gap-2">
                    <input
                      value={editOptionLabel}
                      onChange={(e) => setEditOptionLabel(e.target.value)}
                      className="field field-sm min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-10"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => updateAttributeOption(opt.id, editOptionLabel),
                          () => setEditingOptionId(null)
                        )
                      }
                    >
                      Listo
                    </Button>
                  </div>
                );
              }

              const on = selected.has(opt.id);
              return (
                <div
                  key={opt.id}
                  className={`group/chip inline-flex h-9 items-center rounded-full text-sm transition-colors ${
                    on
                      ? "bg-[var(--ink)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--ink-soft)] hover:bg-[var(--line)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleOption(opt.id)}
                    aria-pressed={on}
                    className="inline-flex h-full items-center gap-1.5 pl-3.5 pr-3 font-semibold"
                  >
                    {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                    {opt.label}
                  </button>
                  <span
                    className={`mr-1 flex items-center opacity-60 transition-opacity group-hover/chip:opacity-100 sm:opacity-0 ${
                      on ? "text-white/90" : "text-[var(--muted)]"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      title="Renombrar"
                      onClick={() => {
                        setEditingOptionId(opt.id);
                        setEditOptionLabel(opt.label);
                      }}
                      className="rounded-full p-1.5 hover:bg-black/10 disabled:opacity-40"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      title="Eliminar"
                      onClick={() =>
                        run(
                          () => deleteAttributeOption(opt.id),
                          () => onOptionRemoved(opt.id)
                        )
                      }
                      className="rounded-full p-1.5 hover:bg-black/10 disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              value={newOptionByGroup[group.id] ?? ""}
              onChange={(e) =>
                setNewOptionByGroup((prev) => ({ ...prev, [group.id]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const label = newOptionByGroup[group.id] ?? "";
                  if (!label.trim()) return;
                  run(
                    () => createAttributeOption(group.id, label),
                    () => setNewOptionByGroup((prev) => ({ ...prev, [group.id]: "" }))
                  );
                }
              }}
              placeholder={`Nuevo valor en ${group.name}…`}
              className="field field-sm field-quiet min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={busy}
              aria-label={`Agregar a ${group.name}`}
              onClick={() => {
                const label = newOptionByGroup[group.id] ?? "";
                run(
                  () => createAttributeOption(group.id, label),
                  () => setNewOptionByGroup((prev) => ({ ...prev, [group.id]: "" }))
                );
              }}
              className="icon-btn h-10 w-10 bg-[var(--surface-muted)] text-[var(--ink)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </section>
      ))}

      <div className="flex gap-2 border-t border-[var(--line)] pt-5">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Nueva categoría (ej. Talla)…"
          className="field field-sm field-quiet min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-10"
          disabled={busy}
          onClick={() =>
            run(
              () => createAttributeGroup(newGroupName),
              () => setNewGroupName("")
            )
          }
        >
          <Plus className="h-4 w-4" />
          Añadir
        </Button>
      </div>
    </div>
  );
}
