import { Package, Plus } from "lucide-react";
import { listProducts } from "@/app/actions/products";
import { PageHeader } from "@/components/layout/page-header";
import { ProductList } from "@/components/productos/product-list";
import { LinkButton } from "@/components/ui/button";
export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const products = await listProducts();

  return (
    <>
      <PageHeader
        eyebrow="Módulo"
        title="Productos"
        description="Tu catálogo. Editar o eliminar desde cada fila."
        icon={Package}
        action={
          <LinkButton href="/productos/nuevo">
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo producto
          </LinkButton>
        }
      />
      <ProductList products={products} />
    </>
  );
}
