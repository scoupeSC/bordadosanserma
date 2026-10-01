import { Receipt, Plus } from "lucide-react";
import { listSales } from "@/app/actions/sales";
import { PageHeader } from "@/components/layout/page-header";
import { SalesListPanel } from "@/components/ventas/sales-list-panel";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const initial = await listSales({ preset: "7d" });

  return (
    <>
      <PageHeader
        eyebrow="Módulo"
        title="Ventas"
        description="Busca por cliente y filtra por fecha. Registra pedidos con pago y entrega."
        icon={Receipt}
        action={
          <LinkButton href="/ventas/nueva">
            <Plus className="h-4 w-4" aria-hidden />
            Nueva venta
          </LinkButton>
        }
      />
      <SalesListPanel initial={initial} initialPreset="7d" />
    </>
  );
}
