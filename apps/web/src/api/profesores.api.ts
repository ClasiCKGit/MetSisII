import type { ProfesorPayload } from "@/features/profesores/schemas";
import type { Profesor } from "@/features/profesores/types";
import { apiClient } from "@/lib/api-client";

export async function listarProfesores(): Promise<Profesor[]> {
  const { data } = await apiClient.get<Profesor[]>("/profesores");
  return data;
}

export async function crearProfesor(input: ProfesorPayload): Promise<Profesor> {
  const { data } = await apiClient.post<Profesor>("/profesores", input);
  return data;
}

export async function actualizarProfesor(
  id: string,
  cambios: Partial<ProfesorPayload> & { activo?: boolean }
): Promise<Profesor> {
  const { data } = await apiClient.patch<Profesor>(`/profesores/${id}`, cambios);
  return data;
}
