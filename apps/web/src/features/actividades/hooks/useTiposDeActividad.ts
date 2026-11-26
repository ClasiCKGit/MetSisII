import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarTipoMembresia,
  crearTipoMembresia,
  darDeBajaTipoMembresia,
  listarTiposMembresia,
} from "@/api/tipos-membresia.api";
import type { TipoMembresiaPayload } from "../schemas";

// Debajo de ["tipos-membresia"], la clave que usa la inscripción: invalidar ese prefijo
// actualiza las dos listas
const claveDeTipos = (actividadId: string) => ["tipos-membresia", { actividadId }] as const;

export function useTiposDeActividad(actividadId: string) {
  return useQuery({
    queryKey: claveDeTipos(actividadId),
    queryFn: () => listarTiposMembresia(actividadId),
  });
}

function useInvalidarTipos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tipos-membresia"] });
}

export function useCrearTipo(actividadId: string) {
  const invalidar = useInvalidarTipos();
  return useMutation({
    mutationFn: (tipo: TipoMembresiaPayload) => crearTipoMembresia({ ...tipo, actividadId }),
    onSuccess: invalidar,
  });
}

export function useActualizarTipo() {
  const invalidar = useInvalidarTipos();
  return useMutation({
    mutationFn: ({
      id,
      cambios,
    }: {
      id: string;
      cambios: Partial<TipoMembresiaPayload> & { activo?: boolean };
    }) => actualizarTipoMembresia(id, cambios),
    onSuccess: invalidar,
  });
}

export function useDarDeBajaTipo() {
  const invalidar = useInvalidarTipos();
  return useMutation({ mutationFn: darDeBajaTipoMembresia, onSuccess: invalidar });
}
