import { notFound } from "next/navigation";
import { User } from "lucide-react";
import { getCustomerDetail } from "@/app/actions/customers";
import { CustomerDetailView } from "@/components/clientes/customer-detail-view";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title={detail.customer.name}
        description="Resumen, ventas y abonos de este cliente."
        backHref="/clientes"
        backLabel="Todos los clientes"
        icon={User}
      />
      <CustomerDetailView initial={detail} />
    </>
  );
}
