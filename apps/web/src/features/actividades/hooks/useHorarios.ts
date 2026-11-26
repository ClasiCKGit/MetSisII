import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarHorario,
  crearHorario,
  eliminarHorario,
  listarHorariosDeActividad,
} from "@/api/horarios.api";
import type { HorarioPayload } from "../schemas";

const claveDeHorarios = (actividadId: string) => ["actividades", actividadId, "horarios"] as const;

export function useHorariosDeActividad(actividadId: string) {
  return useQuery({
    queryKey: claveDeHorarios(actividadId),
    queryFn: () => listarHorariosDeActividad(actividadId),
  });
}

function useInvalidarHorarios(actividadId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: claveDeHorarios(actividadId) });
}

export function useCrearHorario(actividadId: string) {
  const invalidar = useInvalidarHorarios(actividadId);
  return useMutation({
    mutationFn: (horario: HorarioPayload) => crearHorario({ ...horario, actividadId }),
    onSuccess: invalidar,
  });
}

export function useActualizarHorario(actividadId: string) {
  const invalidar = useInvalidarHorarios(actividadId);
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: HorarioPayload }) =>
      actualizarHorario(id, cambios),
    onSuccess: invalidar,
  });
}

export function useEliminarHorario(actividadId: string) {
  const invalidar = useInvalidarHorarios(actividadId);
  return useMutation({ mutationFn: eliminarHorario, onSuccess: invalidar });
}
