import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarUsuario,
  crearUsuario,
  listarUsuarios,
  resetearPassword,
} from "@/api/usuarios.api";
import type { EditarUsuarioInput, ResetPasswordInput } from "../schemas";

// La clave identifica estos datos en la caché de TanStack Query
const USUARIOS_KEY = ["usuarios"] as const;

export function useUsuarios() {
  return useQuery({ queryKey: USUARIOS_KEY, queryFn: listarUsuarios });
}

// Después de crear o modificar algo, se marca la lista como "vieja" (invalidate): TanStack Query
// la vuelve a pedir sola y la tabla se actualiza sin que ningún componente tenga que hacerlo.
function useInvalidarUsuarios() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USUARIOS_KEY });
}

export function useCrearUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({ mutationFn: crearUsuario, onSuccess: invalidar });
}

export function useActualizarUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: ({
      id,
      cambios,
    }: {
      id: string;
      cambios: Partial<EditarUsuarioInput> & { activo?: boolean };
    }) => actualizarUsuario(id, cambios),
    onSuccess: invalidar,
  });
}

// Resetear la contraseña no cambia nada de lo que muestra la lista: no hace falta invalidar
export function useResetearPassword() {
  return useMutation({
    mutationFn: ({ id, valores }: { id: string; valores: ResetPasswordInput }) =>
      resetearPassword(id, valores),
  });
}
