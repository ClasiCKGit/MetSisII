import type { FiltrosPagos, Pago } from "@/features/pagos/types";
import { apiClient } from "@/lib/api-client";

export async function listarPagos(filtros: FiltrosPagos): Promise<Pago[]> {
  const { data } = await apiClient.get<Pago[]>("/pagos", { params: filtros });
  return data;
}

// Reporte CSV con los mismos filtros que el listado (solo ADMIN). Se pide como texto:
// los errores siguen llegando como JSON y api-error los interpreta.
export async function exportarPagos(filtros: FiltrosPagos): Promise<string> {
  const { data } = await apiClient.get<string>("/pagos/exportar", {
    params: filtros,
    responseType: "text",
  });
  return data;
}

// Solo un pago pendiente cambia de estado (la API responde 409 si no)
export async function actualizarEstadoPago(
  id: string,
  estado: "PAGADO" | "RECHAZADO"
): Promise<Pago> {
  const { data } = await apiClient.patch<Pago>(`/pagos/${id}/estado`, { estado });
  return data;
}
