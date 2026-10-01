import Link from "next/link";
import { Pencil, PackageOpen } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import type { ProductRow } from "@/lib/types";
import { DeleteProductButton } from "@/components/productos/delete-product-button";
import { ProductCatalogImage } from "@/components/productos/product-catalog-image";
import { LinkButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";

export function ProductList({ products }: { products: ProductRow[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Sin productos"
        description="Nombre y precio bastan para empezar. Luego puedes sumar foto, stock, insumos y etiquetas."
        action={<LinkButton href="/productos/nuevo">Crear mi primer producto</LinkButton>}
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((p) => {
        const tags = p.product_attribute_options
          .map((row) => row.attribute_options)
          .filter(Boolean);

        const grouped = tags.reduce<Record<string, string[]>>((acc, t) => {
          const key = t.attribute_groups.name;
          acc[key] ??= [];
          acc[key].push(t.label);
          return acc;
        }, {});

        return (
          <li key={p.id} className="card card-hover flex flex-col overflow-hidden">
            <div className="flex gap-4 p-4">
              <ProductCatalogImage
                name={p.name}
                imageUrl={p.image_url}
                className="h-20 w-20 shrink-0 rounded-[12px]"
                iconClassName="h-20 w-20 shrink-0 rounded-[12px]"
              />
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-[var(--ink)]">
                  {p.name}
                </h2>
                <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-[var(--ink)]">
                  {formatMoney(Number(p.unit_price))}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {p.track_stock && (
                    <Chip tone="info" className="tabular-nums">
                      Stock {Number(p.stock ?? 0)}
                    </Chip>
                  )}
                  {p.use_supplies && (p.product_supplies?.length ?? 0) > 0 && (
                    <Chip tone="accent">{p.product_supplies!.length} insumo(s)</Chip>
                  )}
                  <span className="text-[11px] text-[var(--faint)]">{formatDate(p.created_at)}</span>
                </div>
              </div>
            </div>

            {Object.keys(grouped).length > 0 && (
              <dl className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--line)] px-4 py-3">
                {Object.entries(grouped).map(([group, values]) => (
                  <div key={group} className="flex flex-wrap items-center gap-1.5">
                    <dt className="eyebrow text-[10px]">{group}</dt>
                    {values.map((v) => (
                      <dd key={`${group}-${v}`} className="chip bg-[var(--chip)] text-[var(--chip-text)]">
                        {v}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-auto flex gap-2 border-t border-[var(--line)] p-3">
              <Link
                href={`/productos/${p.id}/editar`}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius-xs)] bg-[var(--surface-muted)] text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--line)]"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Editar
              </Link>
              <DeleteProductButton id={p.id} name={p.name} compact />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
