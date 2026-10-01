import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/gastos/expense-form";

export default function NuevoGastoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Gastos"
        title="Registrar gasto"
        description="Indica en qué se gastó, cuánto y la fecha."
        backHref="/gastos"
        backLabel="Volver"
        icon={Plus}
      />
      <ExpenseForm mode="create" />
    </>
  );
}
