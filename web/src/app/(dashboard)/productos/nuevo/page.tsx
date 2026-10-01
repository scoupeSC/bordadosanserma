import { PlusCircle } from "lucide-react";
import { getAttributeCatalog } from "@/app/actions/catalog";
import { ProductForm } from "@/components/productos/product-form";
import { PageHeader } from "@/components/layout/page-header";
export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const catalog = await getAttributeCatalog();

  return (
    <>
      <PageHeader
        eyebrow="Productos"
        title="Nuevo producto"
        description="Paso 1: nombre y precio. Paso 2: etiquetas si las necesitas."
        backHref="/productos"
        backLabel="Volver"
        icon={PlusCircle}
      />
      <ProductForm mode="create" catalog={catalog} />
    </>
  );
}
