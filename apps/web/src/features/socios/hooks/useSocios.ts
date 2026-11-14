import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actualizarSocio, crearSocio, listarSocios, type FiltrosSocios } from "@/api/socios.api";
import type { SocioInput } from "../schemas";

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

// Invalidar con la clave base marca como "vieja" la lista de todos los filtros a la vez
function useInvalidarSocios() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SOCIOS_KEY });
}

export function useCrearSocio() {
  const invalidar = useInvalidarSocios();
  return useMutation({ mutationFn: crearSocio, onSuccess: invalidar });
}

export function useActualizarSocio() {
  const invalidar = useInvalidarSocios();
  return useMutation({
    mutationFn: ({
      id,
      cambios,
    }: {
      id: string;
      cambios: Partial<SocioInput> & { activo?: boolean };
    }) => actualizarSocio(id, cambios),
    onSuccess: invalidar,
  });
}
