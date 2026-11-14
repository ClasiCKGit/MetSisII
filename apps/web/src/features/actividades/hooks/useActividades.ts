import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actualizarActividad, crearActividad, listarActividades } from "@/api/actividades.api";
import type { ActividadPayload } from "../schemas";

const ACTIVIDADES_KEY = ["actividades"] as const;

export function useActividades() {
  return useQuery({ queryKey: ACTIVIDADES_KEY, queryFn: listarActividades });
}

function useInvalidarActividades() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ACTIVIDADES_KEY });
}

export function useCrearActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({ mutationFn: crearActividad, onSuccess: invalidar });
}

export function useActualizarActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({
    mutationFn: ({
      id,
      cambios,
    }: {
      id: string;
      cambios: Partial<ActividadPayload> & { activa?: boolean };
    }) => actualizarActividad(id, cambios),
    onSuccess: invalidar,
  });
}
