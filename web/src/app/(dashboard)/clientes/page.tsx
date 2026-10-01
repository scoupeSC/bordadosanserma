import { Plus, Users } from "lucide-react";
import { listCustomersWithStats } from "@/app/actions/customers";
import { CustomerList } from "@/components/clientes/customer-list";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const customers = await listCustomersWithStats();

  return (
    <>
      <PageHeader
        eyebrow="Personas"
        title="Clientes"
        description="Directorio de clientes, historial de compras y saldos pendientes."
        icon={Users}
        action={
          <LinkButton href="/clientes/nuevo">
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo cliente
          </LinkButton>
        }
      />
      <CustomerList initialCustomers={customers} />
    </>
  );
}
