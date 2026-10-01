import { Plus, Receipt } from "lucide-react";
import { listExpenses } from "@/app/actions/expenses";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseList } from "@/components/gastos/expense-list";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function GastosPage() {
  const expenses = await listExpenses();
  const total = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Empresa"
        title="Gastos"
        description="Registra salidas de dinero con descripción, monto y fecha."
        icon={Receipt}
        action={
          <LinkButton href="/gastos/nuevo">
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo gasto
          </LinkButton>
        }
      />
      <ExpenseList expenses={expenses} total={total} />
    </>
  );
}
