import Link from "next/link";
import { Pencil, Receipt } from "lucide-react";
import type { ExpenseRow } from "@/app/actions/expenses";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDeliveryDate, formatMoney } from "@/lib/format";

export function ExpenseList({ expenses, total }: { expenses: ExpenseRow[]; total: number }) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Aún no hay gastos registrados"
        description="Registra arriendo, transporte, insumos y otros egresos para verlos en Finanzas."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
        <div>
          <p className="eyebrow">Total registrado</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums leading-none text-[var(--danger)]">
            {formatMoney(total)}
          </p>
        </div>
        <p className="text-[13px] text-[var(--muted)]">
          <span className="font-bold text-[var(--ink)]">{expenses.length}</span> gasto(s)
        </p>
      </div>

      <ul className="card divide-y divide-[var(--line)] overflow-hidden">
        {expenses.map((expense) => (
          <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-snug text-[var(--ink)]">
                {expense.description}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {formatDeliveryDate(expense.expense_date)}
              </p>
            </div>
            <p className="shrink-0 text-base font-bold tabular-nums text-[var(--ink)]">
              {formatMoney(expense.amount)}
            </p>
            <Link
              href={`/gastos/${expense.id}/editar`}
              className="icon-btn shrink-0"
              aria-label={`Editar ${expense.description}`}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
