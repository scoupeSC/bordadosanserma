import { notFound } from "next/navigation";
import { getSaleInvoice } from "@/app/actions/sales";
import { SaleInvoiceDocument } from "@/components/ventas/sale-invoice-document";
import { SaleInvoiceToolbar } from "@/components/ventas/sale-invoice-toolbar";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
};

export default async function VentaFacturaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const invoice = await getSaleInvoice(id);
  if (!invoice) notFound();

  return (
    <div className="invoice-page pb-10 print:pb-0">
      <SaleInvoiceToolbar
        saleId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        justCreated={nuevo === "1"}
      />
      <SaleInvoiceDocument invoice={invoice} />
    </div>
  );
}
