import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarSocio,
  crearSocio,
  listarSocios,
  obtenerSocio,
  type FiltrosSocios,
} from "@/api/socios.api";
import { DASHBOARD_KEY } from "@/features/dashboard/hooks/useResumen";
import type { SocioCambios } from "../schemas";

const SOCIOS_KEY = ["socios"] as const;

// La clave incluye los filtros: cada combinación de búsqueda y estado tiene su propia caché.
// keepPreviousData mantiene la lista anterior en pantalla mientras llega la nueva, así no
// parpadea mientras se escribe en el buscador.
export function useSocios(filtros: FiltrosSocios) {
  return useQuery({
    queryKey: [...SOCIOS_KEY, filtros],
    queryFn: () => listarSocios(filtros),
    placeholderData: keepPreviousData,
  });
}

// Un socio por id. Al editarlo, la invalidación de SOCIOS_KEY también refresca esta consulta.
export function useSocio(id: string) {
  return useQuery({
    queryKey: [...SOCIOS_KEY, "detalle", id],
    queryFn: () => obtenerSocio(id),
  });
}

// Invalidar con la clave base marca como "vieja" la lista de todos los filtros a la vez.
// También el resumen del inicio, que cuenta los socios activos.
function useInvalidarSocios() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: SOCIOS_KEY }),
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY }),
    ]);
}

export function useCrearSocio() {
  const invalidar = useInvalidarSocios();
  return useMutation({ mutationFn: crearSocio, onSuccess: invalidar });
}

export function useActualizarSocio() {
  const invalidar = useInvalidarSocios();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: SocioCambios }) =>
      actualizarSocio(id, cambios),
    onSuccess: invalidar,
  });
}
