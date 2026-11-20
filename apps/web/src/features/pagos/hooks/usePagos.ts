import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listarPagos } from "@/api/pagos.api";
import type { FiltrosPagos } from "../types";

export const PAGOS_KEY = ["pagos"] as const;

export function usePagos(filtros: FiltrosPagos) {
  return useQuery({
    queryKey: [...PAGOS_KEY, filtros],
    queryFn: () => listarPagos(filtros),
    placeholderData: keepPreviousData,
  });
}
