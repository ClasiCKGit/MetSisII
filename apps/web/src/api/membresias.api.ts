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

export interface Membresia extends MembresiaSocio {
  socio: { id: string; nombre: string; apellido: string };
}

export async function listarMembresiasSocio(socioId: string): Promise<MembresiaSocio[]> {
  const { data } = await apiClient.get<MembresiaSocio[]>("/membresias", { params: { socioId } });
  return data;
}

export async function listarMembresiasPorVigencia(
  vigencia: EstadoVigenciaMembresia
): Promise<Membresia[]> {
  const { data } = await apiClient.get<Membresia[]>("/membresias", { params: { vigencia } });
  return data;
}
