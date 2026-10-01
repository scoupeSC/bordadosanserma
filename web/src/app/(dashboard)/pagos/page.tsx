import { Wallet } from "lucide-react";
import { listSalesWithBalance } from "@/app/actions/payments";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentsList } from "@/components/pagos/payments-list";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  const sales = await listSalesWithBalance();

  return (
    <>
      <PageHeader
        eyebrow="Cobranza"
        title="Pagos y abonos"
        description="Registra abonos a pedidos fiados o con pago parcial. Al completar el saldo quedan marcados como pagados."
        icon={Wallet}
      />
      <PaymentsList initialSales={sales} />
    </>
  );
}
