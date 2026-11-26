import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actualizarGimnasio, obtenerGimnasio } from "@/api/gimnasio.api";
import { useAuthStore } from "@/store/auth.store";

const GIMNASIO_KEY = ["gimnasio"] as const;

export function useGimnasio() {
  return useQuery({ queryKey: GIMNASIO_KEY, queryFn: obtenerGimnasio });
}

export function useActualizarGimnasio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: actualizarGimnasio,
    onSuccess: (gimnasio) => {
      queryClient.setQueryData(GIMNASIO_KEY, gimnasio);
      // El menú lateral muestra el nombre del gimnasio desde la sesión: se actualiza sin recargar
      useAuthStore.setState((state) =>
        state.gimnasio ? { gimnasio: { ...state.gimnasio, nombre: gimnasio.nombre } } : {}
      );
    },
  });
}
