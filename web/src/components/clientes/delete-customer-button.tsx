"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";

export function DeleteCustomerButton({
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
      const result = await deleteCustomer(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push("/clientes");
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size={compact ? "sm" : "md"}
        className={compact ? "h-9 px-3" : "w-full"}
        onClick={() => setOpen(true)}
        aria-label={compact ? `Eliminar ${name}` : undefined}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {compact ? <span className="sr-only sm:not-sr-only">Eliminar</span> : "Eliminar cliente"}
      </Button>

      {open && (
        <Dialog onClose={() => setOpen(false)} size="md" labelledBy="delete-customer-title">
          <DialogHeader
            id="delete-customer-title"
            title="¿Eliminar cliente?"
            description={
              <>
                <strong className="text-[var(--ink)]">{name}</strong> dejará de aparecer en
                Clientes. Sus ventas anteriores no se borran; siguen en Ventas con el nombre del
                pedido.
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
