export const ESTADOS_VIGENCIA = ["AL_DIA", "POR_VENCER", "VENCIDA"] as const;
export type EstadoVigencia = (typeof ESTADOS_VIGENCIA)[number];

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_POR_VENCER = 7;

export function estadoVigencia(fechaFin: Date, estado: string, ahora = new Date()) {
  if (estado === "CANCELADA") return null;

  // Se comparan días calendario UTC, no horas: la membresía vence al terminar
  // su fecha de fin y queda "por vencer" durante los últimos siete días.
  const fin = Date.UTC(fechaFin.getUTCFullYear(), fechaFin.getUTCMonth(), fechaFin.getUTCDate());
  const hoy = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  const diasRestantes = Math.floor((fin - hoy) / MILISEGUNDOS_POR_DIA);

  if (diasRestantes < 0) return "VENCIDA";
  if (diasRestantes <= DIAS_POR_VENCER) return "POR_VENCER";
  return "AL_DIA";
}

export function agregarEstadoVigencia<T extends { fechaFin: Date; estado: string }>(membresia: T) {
  return { ...membresia, estadoVigencia: estadoVigencia(membresia.fechaFin, membresia.estado) };
}
