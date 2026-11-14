import type { ActividadPayload } from "@/features/actividades/schemas";
import type { Actividad } from "@/features/actividades/types";
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
