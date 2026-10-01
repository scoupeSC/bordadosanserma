import { FlaskConical } from "lucide-react";
import { listOrderSupplies } from "@/app/actions/order-supplies";
import { OrderSuppliesModule } from "@/components/insumos-pedido/order-supplies-module";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function InsumosPedidoPage() {
  const initial = await listOrderSupplies({ preset: "7d" });

  return (
    <>
      <PageHeader
        eyebrow="Producción"
        title="Insumos por pedido"
        description="Lista consolidada de materiales y detalle por pedido, según fecha, estado y búsqueda."
        icon={FlaskConical}
      />
      <OrderSuppliesModule initial={initial} initialPreset="7d" />
    </>
  );
}
