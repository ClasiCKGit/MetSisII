import type { SocioInput } from "@/features/socios/schemas";
import type { Socio } from "@/features/socios/types";
import { apiClient } from "@/lib/api-client";

export interface FiltrosSocios {
  q?: string;
  activo?: boolean;
}

export async function listarSocios(filtros: FiltrosSocios): Promise<Socio[]> {
  const { data } = await apiClient.get<Socio[]>("/socios", { params: filtros });
  return data;
}

export async function crearSocio(input: SocioInput): Promise<Socio> {
  const { data } = await apiClient.post<Socio>("/socios", input);
  return data;
}

// PATCH: solo se envían los campos que cambian
export async function actualizarSocio(
  id: string,
  cambios: Partial<SocioInput> & { activo?: boolean }
): Promise<Socio> {
  const { data } = await apiClient.patch<Socio>(`/socios/${id}`, cambios);
  return data;
}

export async function obtenerSocio(id: string): Promise<Socio> {
  const { data } = await apiClient.get<Socio>(`/socios/${id}`);
  return data;
}
