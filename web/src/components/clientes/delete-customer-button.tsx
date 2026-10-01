"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/notice";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
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
      <Button type="button" variant="danger" className="w-full" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden />
        Eliminar cliente
      </Button>

      {open && (
        <Dialog onClose={() => setOpen(false)} size="md" labelledBy="delete-customer-title">
          <DialogHeader
            id="delete-customer-title"
            title="¿Eliminar cliente?"
            description={
              <>
                <strong className="text-[var(--ink)]">{name}</strong> se quitará de la lista de
                clientes.
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
