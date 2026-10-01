"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cancelSale } from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";

export function DeleteSaleButton({
  saleId,
  label = "Anular venta",
  compact,
}: {
  saleId: string;
  label?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelSale(saleId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push("/ventas");
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant={compact ? "ghost" : "danger"}
        size={compact ? "sm" : "md"}
        className={compact ? "text-[var(--danger)] hover:bg-[var(--danger-bg)]" : "w-full"}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        {label}
      </Button>

      {open && (
        <Dialog onClose={() => setOpen(false)} size="sm" labelledBy="cancel-sale-title">
          <DialogHeader
            id="cancel-sale-title"
            title="¿Anular esta venta?"
            description="La venta dejará de aparecer en el listado. Los productos no se devuelven al inventario automáticamente."
            onClose={() => setOpen(false)}
          />
          {error && (
            <DialogBody className="pt-3">
              <Notice>{error}</Notice>
            </DialogBody>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="flex-1" disabled={pending} onClick={onConfirm}>
              {pending ? "Anulando…" : "Sí, anular"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  );
}
