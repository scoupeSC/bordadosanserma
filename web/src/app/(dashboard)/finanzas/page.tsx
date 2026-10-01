import { LineChart } from "lucide-react";
import { getFinanceDashboard } from "@/app/actions/finances";
import { FinanceDashboard } from "@/components/finanzas/finance-dashboard";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const initial = await getFinanceDashboard({ preset: "7d" });

  return (
    <>
      <PageHeader
        eyebrow="Reportes"
        title="Finanzas"
        description="Ventas, gastos, utilidad y productos más vendidos. Cambia el periodo para ver el detalle."
        icon={LineChart}
      />
      <FinanceDashboard initial={initial} />
    </>
  );
}
