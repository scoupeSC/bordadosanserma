import { Boxes } from "lucide-react";
import { listRecentStockMovements, listStockProducts } from "@/app/actions/stock";
import { StockPanel } from "@/components/inventario/stock-panel";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const [products, movements] = await Promise.all([
    listStockProducts(),
    listRecentStockMovements(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Almacén"
        title="Inventario"
        description="Productos con control de stock. Entradas, salidas y ajustes."
        icon={Boxes}
        action={
          <LinkButton href="/productos/nuevo" variant="secondary">
            Nuevo producto
          </LinkButton>
        }
      />
      <StockPanel initialProducts={products} initialMovements={movements} />
    </>
  );
}
