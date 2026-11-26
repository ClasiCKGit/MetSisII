import type { TipoMembresiaPayload } from "@/features/actividades/schemas";
import { apiClient } from "@/lib/api-client";

export interface TipoMembresia {
  id: string;
  actividadId: string;
  nombre: string;
  // Decimal de la API, como texto: "12500.5"
  precio: string;
  duracionDias: number;
  cantidadClases: number | null;
  activo: boolean;
  actividad: { id: string; nombre: string };
}

// Sin actividadId trae los de todas las actividades (lo usa la inscripción)
export async function listarTiposMembresia(actividadId?: string): Promise<TipoMembresia[]> {
  const { data } = await apiClient.get<TipoMembresia[]>("/tipos-membresia", {
    params: actividadId ? { actividadId } : undefined,
  });
  return data;
}

export async function crearTipoMembresia(
  input: TipoMembresiaPayload & { actividadId: string }
): Promise<TipoMembresia> {
  const { data } = await apiClient.post<TipoMembresia>("/tipos-membresia", input);
  return data;
}

export async function actualizarTipoMembresia(
  id: string,
  cambios: Partial<TipoMembresiaPayload> & { activo?: boolean }
): Promise<TipoMembresia> {
  const { data } = await apiClient.patch<TipoMembresia>(`/tipos-membresia/${id}`, cambios);
  return data;
}

// Baja lógica: el tipo queda con activo: false, porque lo referencian membresías anteriores
export async function darDeBajaTipoMembresia(id: string): Promise<void> {
  await apiClient.delete(`/tipos-membresia/${id}`);
}
