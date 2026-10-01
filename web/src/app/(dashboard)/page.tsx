import Link from "next/link";
import { ArrowRight, ArrowUpRight, LayoutDashboard, Plus } from "lucide-react";
import { listProducts } from "@/app/actions/products";
import { PageHeader } from "@/components/layout/page-header";
import { navGroups, navIcons } from "@/components/layout/nav-items";
import { LinkButton } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const products = await listProducts();
  const total = products.reduce((acc, p) => acc + Number(p.unit_price), 0);

  const modules = navGroups.flatMap((g) => g.items).filter((i) => i.href !== "/");

  return (
    <>
      <PageHeader
        title="Inicio"
        description="Resumen del catálogo y accesos directos a cada módulo."
        icon={LayoutDashboard}
        action={
          <LinkButton href="/ventas/nueva" variant="accent">
            <Plus className="h-4 w-4" aria-hidden />
            Nueva venta
          </LinkButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Productos activos"
          value={String(products.length)}
          hint="En catálogo listo para vender"
        />
        <StatCard
          label="Suma de precios"
          value={formatMoney(total)}
          tone="accent"
          hint="Valor total de una unidad de cada producto"
        />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="eyebrow">Módulos</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-[var(--ink)]">Ir a</h2>
          </div>
          <Link href="/productos" className="link inline-flex items-center gap-1 text-[13px]">
            Ver productos
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {modules.map((item) => {
            const Icon = navIcons[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="card card-hover group flex h-full flex-col gap-3 p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--surface-muted)] text-[var(--ink-soft)] transition-colors group-hover:bg-[var(--ink)] group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-[var(--faint)] transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--ink)]"
                      aria-hidden
                    />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold tracking-tight text-[var(--ink)]">{item.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{item.hint}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
