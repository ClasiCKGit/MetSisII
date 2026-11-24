import { useMutation, useQueryClient } from "@tanstack/react-query";
import { actualizarEstadoPago } from "@/api/pagos.api";
import { DASHBOARD_KEY } from "@/features/dashboard/hooks/useResumen";
import { PAGOS_KEY } from "./usePagos";

// Un pago cobrado suma a los ingresos del mes: también se refresca el inicio
export function useActualizarEstadoPago() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: "PAGADO" | "RECHAZADO" }) =>
      actualizarEstadoPago(id, estado),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: PAGOS_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY }),
      ]),
  });
}
