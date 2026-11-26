import type { ActividadPayload } from "@/features/actividades/schemas.ts";
import type { Actividad, VinculoProfesor } from "@/features/actividades/types";
import { apiClient } from "@/lib/api-client";

export async function listarActividades(): Promise<Actividad[]> {
  const { data } = await apiClient.get<Actividad[]>("/actividades");
  return data;
}

export async function crearActividad(input: ActividadPayload): Promise<Actividad> {
  const { data } = await apiClient.post<Actividad>("/actividades", input);
  return data;
}

export async function actualizarActividad(
  id: string,
  cambios: Partial<ActividadPayload> & { activa?: boolean }
): Promise<Actividad> {
  const { data } = await apiClient.patch<Actividad>(`/actividades/${id}`, cambios);
  return data;
}

export async function obtenerActividad(id: string): Promise<Actividad> {
  const { data } = await apiClient.get<Actividad>(`/actividades/${id}`);
  return data;
}

export async function listarProfesoresDeActividad(actividadId: string): Promise<VinculoProfesor[]> {
  const { data } = await apiClient.get<VinculoProfesor[]>(`/actividades/${actividadId}/profesores`);
  return data;
}

export async function vincularProfesor(
  actividadId: string,
  profesorId: string
): Promise<VinculoProfesor> {
  const { data } = await apiClient.post<VinculoProfesor>(`/actividades/${actividadId}/profesores`, {
    profesorId,
  });
  return data;
}

export async function desvincularProfesor(actividadId: string, profesorId: string): Promise<void> {
  await apiClient.delete(`/actividades/${actividadId}/profesores/${profesorId}`);
}
