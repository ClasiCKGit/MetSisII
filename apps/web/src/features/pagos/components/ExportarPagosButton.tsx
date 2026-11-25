import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api-error";
import { useExportarPagos } from "../hooks/useExportarPagos";
import type { FiltrosPagos } from "../types";

interface ExportarPagosButtonProps {
  filtros: FiltrosPagos;
  nombreArchivo: string;
  disabled?: boolean;
}

/** Descarga en CSV los pagos que coinciden con los filtros de la pantalla. */
export function ExportarPagosButton({
  filtros,
  nombreArchivo,
  disabled,
}: ExportarPagosButtonProps) {
  const exportar = useExportarPagos();

  function descargar() {
    exportar.mutate(
      { filtros, nombre: nombreArchivo },
      {
        onError: (error) =>
          toast.add({
            type: "error",
            title: "No se pudo exportar el reporte",
            description: getErrorMessage(error),
          }),
      }
    );
  }

  return (
    <Button variant="outline" onClick={descargar} disabled={disabled || exportar.isPending}>
      <DownloadIcon aria-hidden="true" />
      {exportar.isPending ? "Exportando…" : "Exportar CSV"}
    </Button>
  );
}
