"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Camera, Download, Printer } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

type Props = {
  saleId: string;
  invoiceNumber: string;
  justCreated?: boolean;
};

export function SaleInvoiceToolbar({ saleId, invoiceNumber, justCreated }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const downloadPdf = () => {
    setError(null);
    startTransition(async () => {
      const sheet = document.getElementById("sale-invoice-sheet");
      if (!sheet) {
        setError("No se encontró el comprobante");
        return;
      }
      try {
        const html2canvas = (await import("html2canvas")).default;
        const { jsPDF } = await import("jspdf");
        const canvas = await html2canvas(sheet, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
        });
        const imgData = canvas.toDataURL("image/png");
        const pdfW = 210;
        const pdfH = (canvas.height * pdfW) / canvas.width;
        const pdf = new jsPDF({
          orientation: pdfH > pdfW ? "portrait" : "portrait",
          unit: "mm",
          format: [pdfW, Math.max(pdfH, 120)],
        });
        pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
        pdf.save(`hader-venta-${invoiceNumber}.pdf`);
      } catch {
        setError("No se pudo generar el PDF. Prueba Imprimir o captura de pantalla.");
      }
    });
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="invoice-toolbar mx-auto mb-5 max-w-[420px] space-y-3 print:hidden">
      {justCreated && (
        <Notice tone="success">
          <span className="font-bold">Venta registrada.</span> Aquí está el comprobante; puedes
          descargarlo, imprimirlo o hacer captura del recuadro blanco.
        </Notice>
      )}

      {error && <Notice>{error}</Notice>}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" disabled={pending} onClick={downloadPdf}>
          <Download className="h-4 w-4" />
          {pending ? "Generando…" : "Descargar PDF"}
        </Button>
        <Button type="button" variant="secondary" onClick={printInvoice}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <Camera className="h-3.5 w-3.5 shrink-0" />
        El recuadro blanco está pensado para captura de pantalla (WhatsApp, etc.).
      </p>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
        <LinkButton href="/ventas/nueva" variant="soft" size="sm">
          Nueva venta
        </LinkButton>
        <LinkButton href={`/ventas/${saleId}/editar`} variant="secondary" size="sm">
          Editar venta
        </LinkButton>
        <Link href="/ventas" className="link ml-auto text-[13px]">
          Listado de ventas
        </Link>
      </div>
    </div>
  );
}
