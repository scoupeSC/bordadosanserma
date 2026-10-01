"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCustomer, updateCustomer } from "@/app/actions/customers";
import { DeleteCustomerButton } from "@/components/clientes/delete-customer-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

export type CustomerFormInitial = {
  name: string;
  phone: string;
  email: string;
};

type Props = {
  mode: "create" | "edit";
  customerId?: string;
  initial?: CustomerFormInitial;
  canDelete?: boolean;
};

export function CustomerForm({ mode, customerId, initial, canDelete }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = { name, phone, email };
      if (mode === "edit" && customerId) {
        const result = await updateCustomer(customerId, payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/clientes/${customerId}`);
      } else {
        const result = await createCustomer(payload);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/clientes/${result.customer.id}`);
      }
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card card-pad">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del cliente"
            required
            autoFocus={mode === "create"}
          />
          <Input
            label="Teléfono (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej. 300 123 4567"
            inputMode="tel"
          />
          <Input
            label="Correo (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
          />
          {error && <Notice>{error}</Notice>}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </form>
      </section>

      {mode === "edit" && customerId && canDelete && (
        <section className="card card-pad">
          <p className="text-sm font-bold text-[var(--ink)]">Zona de cuidado</p>
          <p className="mt-0.5 mb-3 text-[13px] text-[var(--muted)]">
            Elimina el cliente solo si no tiene ventas asociadas.
          </p>
          <DeleteCustomerButton id={customerId} name={name} />
        </section>
      )}
    </div>
  );
}
