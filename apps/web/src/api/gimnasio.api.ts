import type { GimnasioPayload } from "@/features/gimnasio/schemas";
import type { DatosGimnasio } from "@/features/gimnasio/types";
import { apiClient } from "@/lib/api-client";

// Siempre el gimnasio de la sesión: la ruta no lleva id
export async function obtenerGimnasio(): Promise<DatosGimnasio> {
  const { data } = await apiClient.get<DatosGimnasio>("/gimnasio");
  return data;
}

export async function actualizarGimnasio(cambios: GimnasioPayload): Promise<DatosGimnasio> {
  const { data } = await apiClient.patch<DatosGimnasio>("/gimnasio", cambios);
  return data;
}
