import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actualizarProfesor, crearProfesor, listarProfesores } from "@/api/profesores.api";
import type { ProfesorPayload } from "../schemas";

// La clave identifica estos datos en la caché de TanStack Query
const PROFESORES_KEY = ["profesores"] as const;

export function useProfesores() {
  return useQuery({ queryKey: PROFESORES_KEY, queryFn: listarProfesores });
}

// Después de crear o modificar algo, se marca la lista como "vieja" (invalidate) y TanStack Query
// la vuelve a pedir sola: la tabla se actualiza sin que ningún componente tenga que hacerlo.
function useInvalidarProfesores() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PROFESORES_KEY });
}

export function useCrearProfesor() {
  const invalidar = useInvalidarProfesores();
  return useMutation({ mutationFn: crearProfesor, onSuccess: invalidar });
}

export function useActualizarProfesor() {
  const invalidar = useInvalidarProfesores();
  return useMutation({
    mutationFn: ({
      id,
      cambios,
    }: {
      id: string;
      cambios: Partial<ProfesorPayload> & { activo?: boolean };
    }) => actualizarProfesor(id, cambios),
    onSuccess: invalidar,
  });
}
