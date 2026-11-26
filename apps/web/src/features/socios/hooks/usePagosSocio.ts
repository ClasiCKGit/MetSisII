import { useQuery } from "@tanstack/react-query";
import { listarPagos } from "@/api/pagos.api";
import { PAGOS_KEY } from "@/features/pagos/hooks/usePagos";

// Sin keepPreviousData: al pasar de un socio a otro no deben verse los pagos del anterior
export function usePagosSocio(socioId: string) {
  return useQuery({
    queryKey: [...PAGOS_KEY, { socioId }],
    queryFn: () => listarPagos({ socioId }),
    enabled: Boolean(socioId),
  });
}
