import { ShoppingBag } from "lucide-react";
import { getCustomerById } from "@/app/actions/customers";
import { listCatalogProducts } from "@/app/actions/sales";
import { PageHeader } from "@/components/layout/page-header";
import { SaleWorkspace } from "@/components/ventas/sale-workspace";
import type { SaleCheckoutInitial } from "@/lib/sale-checkout-initial";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ cliente?: string }> };

export default async function NuevaVentaPage({ searchParams }: Props) {
  const catalog = await listCatalogProducts();
  const { cliente: clienteId } = await searchParams;
  let checkoutInitial: SaleCheckoutInitial | undefined;
  if (clienteId) {
    const customer = await getCustomerById(clienteId);
    if (customer) {
      checkoutInitial = {
        customer,
        customerNameFallback: null,
        paymentStatus: "paid",
        orderStatus: "pending",
        amountPaid: 0,
        deliveryDate: null,
      };
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Ventas"
        title="Nueva venta"
        description="Elige productos como en una tienda, luego pasa al carrito para cobrar."
        backHref="/ventas"
        backLabel="Volver"
        icon={ShoppingBag}
      />
      <SaleWorkspace catalog={catalog} checkoutInitial={checkoutInitial} />
    </>
  );
}
