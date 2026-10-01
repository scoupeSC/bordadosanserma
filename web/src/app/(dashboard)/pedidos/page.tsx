import { Columns3 } from "lucide-react";
import { listOrdersForBoard } from "@/app/actions/orders";
import { PageHeader } from "@/components/layout/page-header";
import { OrdersKanban } from "@/components/pedidos/orders-kanban";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const orders = await listOrdersForBoard();

  return (
    <>
      <PageHeader
        eyebrow="Producción"
        title="Pedidos"
        description="Filtra por cliente o entrega. Colores por etapa: pendiente, en proceso y terminado."
        icon={Columns3}
      />
      <OrdersKanban initialOrders={orders} />
    </>
  );
}
