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

export async function listarTiposMembresia(): Promise<TipoMembresia[]> {
  const { data } = await apiClient.get<TipoMembresia[]>("/tipos-membresia");
  return data;
}
