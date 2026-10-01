import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getCustomerDetail } from "@/app/actions/customers";
import { CustomerForm } from "@/components/clientes/customer-form";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();

  const c = detail.customer;
  const canDelete = detail.stats.salesCount === 0;

  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title="Editar cliente"
        description={c.name}
        backHref={`/clientes/${id}`}
        backLabel="Volver al perfil"
        icon={Pencil}
      />
      <CustomerForm
        mode="edit"
        customerId={id}
        canDelete={canDelete}
        initial={{
          name: c.name,
          phone: c.phone ?? "",
          email: c.email ?? "",
        }}
      />
    </>
  );
}
