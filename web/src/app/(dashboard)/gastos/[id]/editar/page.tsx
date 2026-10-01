import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getExpense } from "@/app/actions/expenses";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/gastos/expense-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditarGastoPage({ params }: PageProps) {
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Gastos"
        title="Editar gasto"
        description="Actualiza descripción, monto o fecha."
        backHref="/gastos"
        backLabel="Volver"
        icon={Pencil}
      />
      <ExpenseForm
        key={expense.id}
        mode="edit"
        expenseId={expense.id}
        initial={{
          description: expense.description,
          amount: expense.amount,
          expenseDate: expense.expense_date,
        }}
      />
    </>
  );
}
