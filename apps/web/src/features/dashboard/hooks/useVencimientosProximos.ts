import { useQuery } from "@tanstack/react-query";
import { listarMembresiasPorVigencia } from "@/api/membresias.api";
import { DASHBOARD_KEY } from "./useResumen";

// Bajo la clave del inicio: lo que invalida las métricas también refresca esta lista
export function useVencimientosProximos() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "vencimientos"],
    queryFn: () => listarMembresiasPorVigencia("POR_VENCER"),
  });
}
