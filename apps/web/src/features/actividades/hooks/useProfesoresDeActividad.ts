import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  desvincularProfesor,
  listarProfesoresDeActividad,
  obtenerActividad,
  vincularProfesor,
} from "@/api/actividades.api";

const claveDeActividad = (id: string) => ["actividades", id] as const;
const claveDeProfesores = (id: string) => ["actividades", id, "profesores"] as const;

export function useActividad(id: string) {
  return useQuery({ queryKey: claveDeActividad(id), queryFn: () => obtenerActividad(id) });
}

export function useProfesoresDeActividad(actividadId: string) {
  return useQuery({
    queryKey: claveDeProfesores(actividadId),
    queryFn: () => listarProfesoresDeActividad(actividadId),
  });
}

export function useVincularProfesor(actividadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profesorId: string) => vincularProfesor(actividadId, profesorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveDeProfesores(actividadId) }),
  });
}

export function useDesvincularProfesor(actividadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profesorId: string) => desvincularProfesor(actividadId, profesorId),
    // Toda la actividad, no solo sus profesores: los horarios del profesor quitado quedan sin profesor
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claveDeActividad(actividadId) }),
  });
}
