import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inscribirSocio } from "@/api/membresias.api";
import { listarTiposMembresia } from "@/api/tipos-membresia.api";
import { DASHBOARD_KEY } from "@/features/dashboard/hooks/useResumen";
import { PAGOS_KEY } from "@/features/pagos/hooks/usePagos";
import { MEMBRESIAS_KEY } from "./useMembresiasSocio";

export function useTiposMembresia() {
  return useQuery({ queryKey: ["tipos-membresia"], queryFn: listarTiposMembresia });
}

// La inscripción crea una membresía y un pago pendiente: cambian las membresías del socio,
// sus pagos y los números del inicio (vencimientos próximos)
export function useInscribirSocio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inscribirSocio,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MEMBRESIAS_KEY }),
        queryClient.invalidateQueries({ queryKey: PAGOS_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY }),
      ]),
  });
}
