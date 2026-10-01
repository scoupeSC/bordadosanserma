import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getSaleForEdit, listCatalogProducts } from "@/app/actions/sales";
import { PageHeader } from "@/components/layout/page-header";
import { SaleEditView } from "@/components/ventas/sale-edit-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditarVentaPage({ params }: PageProps) {
  const { id } = await params;
  const [sale, catalog] = await Promise.all([getSaleForEdit(id), listCatalogProducts()]);

  if (!sale) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Ventas"
        title="Editar venta"
        description="Ajusta cantidades y variantes, o agrega un producto más al pedido."
        backHref="/ventas"
        backLabel="Volver"
        icon={Pencil}
      />

      <SaleEditView sale={sale} catalog={catalog} />
    </>
  );
}
