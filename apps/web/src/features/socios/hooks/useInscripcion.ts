import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelarMembresia,
  inscribirSocio,
  renovarMembresia,
  type RenovacionInput,
} from "@/api/membresias.api";
import { listarTiposMembresia } from "@/api/tipos-membresia.api";
import { DASHBOARD_KEY } from "@/features/dashboard/hooks/useResumen";
import { PAGOS_KEY } from "@/features/pagos/hooks/usePagos";
import { MEMBRESIAS_KEY } from "./useMembresiasSocio";

export function useTiposMembresia() {
  return useQuery({ queryKey: ["tipos-membresia"], queryFn: () => listarTiposMembresia() });
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

// Igual que la inscripción: cambian las membresías, los pagos y los vencimientos del inicio
export function useRenovarMembresia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RenovacionInput }) =>
      renovarMembresia(id, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MEMBRESIAS_KEY }),
        queryClient.invalidateQueries({ queryKey: PAGOS_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY }),
      ]),
  });
}

// Cambian las membresías, los pagos (los pendientes pasan a rechazados) y el inicio
export function useCancelarMembresia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelarMembresia,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: MEMBRESIAS_KEY }),
        queryClient.invalidateQueries({ queryKey: PAGOS_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY }),
      ]),
  });
}
