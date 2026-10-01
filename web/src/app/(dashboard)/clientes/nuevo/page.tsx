import { UserPlus } from "lucide-react";
import { CustomerForm } from "@/components/clientes/customer-form";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default function NuevoClientePage() {
  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title="Nuevo cliente"
        description="Nombre y datos de contacto. Podrás vincularlo en ventas y ver su historial."
        backHref="/clientes"
        backLabel="Volver"
        icon={UserPlus}
      />
      <CustomerForm mode="create" />
    </>
  );
}
