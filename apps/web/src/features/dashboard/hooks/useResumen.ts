import { useQuery } from "@tanstack/react-query";
import { obtenerResumen } from "@/api/dashboard.api";

// Clave base de las métricas del inicio. Los módulos que cambian esos números (por ahora,
// socios) la invalidan, así el inicio no muestra un valor viejo al volver.
export const DASHBOARD_KEY = ["dashboard"] as const;

export function useResumen() {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, "resumen"],
    queryFn: obtenerResumen,
  });
}
