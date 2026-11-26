import type { HorarioPayload } from "@/features/actividades/schemas";
import type { Horario } from "@/features/actividades/types";
import { apiClient } from "@/lib/api-client";

export async function listarHorariosDeActividad(actividadId: string): Promise<Horario[]> {
  const { data } = await apiClient.get<Horario[]>("/horarios", { params: { actividadId } });
  return data;
}

export async function crearHorario(
  input: HorarioPayload & { actividadId: string }
): Promise<Horario> {
  const { data } = await apiClient.post<Horario>("/horarios", input);
  return data;
}

export async function actualizarHorario(id: string, cambios: HorarioPayload): Promise<Horario> {
  const { data } = await apiClient.patch<Horario>(`/horarios/${id}`, cambios);
  return data;
}

export async function eliminarHorario(id: string): Promise<void> {
  await apiClient.delete(`/horarios/${id}`);
}
