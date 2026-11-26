import { useQuery } from "@tanstack/react-query";
import { listarMembresiasPorVigencia } from "@/api/membresias.api";
import { DASHBOARD_KEY } from "./useResumen";

// Bajo la clave del inicio: lo que invalida las métricas también refresca esta lista
export function useVencimientosProximos() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "vencimientos"],
    // Las renovadas vencen, pero el socio ya tiene la siguiente: no hay nada que hacer con
    // ellas (el contador del resumen tampoco las cuenta)
    queryFn: async () =>
      (await listarMembresiasPorVigencia("POR_VENCER")).filter((m) => !m.renovada),
  });
}
