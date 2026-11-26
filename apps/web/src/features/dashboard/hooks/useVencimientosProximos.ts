import { useQuery } from "@tanstack/react-query";
import { listarMembresiasPorVigencia } from "@/api/membresias.api";
import { DASHBOARD_KEY } from "./useResumen";

// Bajo la clave del inicio: lo que invalida las métricas también refresca estas listas.
// Las dos dejan afuera las renovadas: el socio ya tiene la siguiente membresía, no hay nada que
// hacer con ellas (el contador del resumen tampoco las cuenta).

export function useVencimientosProximos() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "vencimientos"],
    queryFn: () => listarMembresiasPorVigencia("POR_VENCER"),
  });
}

/** Membresías vencidas que el socio no renovó ni reemplazó con otra inscripción. */
export function useMembresiasVencidas() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "vencidas"],
    queryFn: () => listarMembresiasPorVigencia("VENCIDA"),
  });
}
