"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createExpense, updateExpense } from "@/app/actions/expenses";
import { DeleteExpenseButton } from "@/components/gastos/delete-expense-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

export type ExpenseFormInitial = {
  description: string;
  amount: number;
  expenseDate: string;
};

type Props = {
  mode: "create" | "edit";
  expenseId?: string;
  initial?: ExpenseFormInitial;
};

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ExpenseForm({ mode, expenseId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : ""
  );
  const [expenseDate, setExpenseDate] = useState(initial?.expenseDate ?? todayIsoDate());
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number(String(amount).replace(/,/g, "."));
    startTransition(async () => {
      const payload = {
        description,
        amount: parsedAmount,
        expenseDate,
      };
      const result =
        mode === "edit" && expenseId
          ? await updateExpense(expenseId, payload)
          : await createExpense(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/gastos");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card card-pad">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Arriendo, transporte, insumos…"
            required
            autoFocus={mode === "create"}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Monto"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              className="text-base font-bold tabular-nums"
            />
            <label className="block">
              <span className="label mb-1.5">Fecha del gasto</span>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="field"
              />
            </label>
          </div>

          {error && <Notice>{error}</Notice>}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Registrar gasto"}
          </Button>
        </form>
      </section>

      {mode === "edit" && expenseId && (
        <section className="card card-pad">
          <p className="text-sm font-bold text-[var(--ink)]">Zona de cuidado</p>
          <p className="mt-0.5 mb-3 text-[13px] text-[var(--muted)]">
            Este gasto dejará de contarse en Finanzas.
          </p>
          <DeleteExpenseButton id={expenseId} description={description} />
        </section>
      )}
    </div>
  );
}
