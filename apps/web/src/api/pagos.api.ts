import type { FiltrosPagos, Pago } from "@/features/pagos/types";
import { apiClient } from "@/lib/api-client";

export async function listarPagos(filtros: FiltrosPagos): Promise<Pago[]> {
  const { data } = await apiClient.get<Pago[]>("/pagos", { params: filtros });
  return data;
}
