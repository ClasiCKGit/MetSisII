import { useMutation } from "@tanstack/react-query";
import { exportarPagos } from "@/api/pagos.api";
import { descargarCsv } from "@/lib/descargar";
import type { FiltrosPagos } from "../types";

// Es una mutación y no una query: se pide al hacer clic y no se guarda en caché
export function useExportarPagos() {
  return useMutation({
    mutationFn: async ({ filtros, nombre }: { filtros: FiltrosPagos; nombre: string }) => {
      descargarCsv(await exportarPagos(filtros), nombre);
    },
  });
}
