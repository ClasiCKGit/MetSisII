import { apiClient } from "@/lib/api-client";

export type EstadoVigenciaMembresia = "AL_DIA" | "POR_VENCER" | "VENCIDA";

export interface MembresiaSocio {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "ACTIVA" | "VENCIDA" | "CANCELADA";
  estadoVigencia: EstadoVigenciaMembresia | null;
  actividad: { id: string; nombre: string };
  tipoMembresia: { id: string; nombre: string; duracionDias: number };
}

export async function listarMembresiasSocio(socioId: string): Promise<MembresiaSocio[]> {
  const { data } = await apiClient.get<MembresiaSocio[]>("/membresias", { params: { socioId } });
  return data;
}
