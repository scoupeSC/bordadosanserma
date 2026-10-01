"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";

export function DeleteProductButton({
  id,
  name,
  compact,
}: {
  id: string;
  name: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push("/productos");
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size={compact ? "sm" : "md"}
        className={compact ? "h-10 px-3" : undefined}
        onClick={() => setOpen(true)}
        aria-label={compact ? `Eliminar ${name}` : undefined}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {compact ? <span className="sr-only sm:not-sr-only">Eliminar</span> : "Eliminar"}
      </Button>

      {open && (
        <Dialog onClose={() => setOpen(false)} size="md" labelledBy="delete-title">
          <DialogHeader
            id="delete-title"
            title="¿Eliminar este producto?"
            description={
              <>
                <strong className="text-[var(--ink)]">{name}</strong> dejará de mostrarse en el
                catálogo. Las ventas ya registradas no se modifican.
              </>
            }
            onClose={() => setOpen(false)}
          />
          {error && (
            <DialogBody className="pt-3">
              <Notice>{error}</Notice>
            </DialogBody>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              No, cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  );
}
