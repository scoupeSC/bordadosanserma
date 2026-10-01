import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getAttributeCatalog } from "@/app/actions/catalog";
import { getProduct } from "@/app/actions/products";
import { ProductForm } from "@/components/productos/product-form";
import { PageHeader } from "@/components/layout/page-header";
import { extractProductOptionIds } from "@/lib/product-utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditarProductoPage({ params }: PageProps) {
  const { id } = await params;
  const [product, catalog] = await Promise.all([getProduct(id), getAttributeCatalog()]);

  if (!product) notFound();

  const optionIds = extractProductOptionIds(product);
  const price = Number(product.unit_price);
  const supplies = [...(product.product_supplies ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const initial = {
    name: product.name,
    price,
    imageUrl: product.image_url ?? null,
    optionIds,
    trackStock: Boolean(product.track_stock),
    stock: Number(product.stock ?? 0),
    minStock: Number(product.min_stock ?? 0),
    useSupplies: Boolean(product.use_supplies),
    supplies: supplies.map((s) => ({
      name: s.name,
      quantity: Number(s.quantity),
      unit_price: s.unit_price != null ? Number(s.unit_price) : null,
    })),
  };

  return (
    <>
      <PageHeader
        eyebrow="Productos"
        title="Editar producto"
        description="Los campos ya traen la información guardada."
        backHref="/productos"
        backLabel="Volver"
        icon={Pencil}
      />

      <ProductForm
        key={product.id}
        mode="edit"
        productId={product.id}
        catalog={catalog}
        initial={initial}
      />
    </>
  );
}
