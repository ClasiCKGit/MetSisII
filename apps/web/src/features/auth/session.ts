import { queryClient } from "../../lib/query-client";
import { useAuthStore } from "../../store/auth.store";

// Cierra la sesión: borra el token y también todo lo que haya en la caché de
// TanStack Query, para que otro usuario que inicie sesión después no vea datos del anterior.
export function cerrarSesion(): void {
  useAuthStore.getState().logout();
  queryClient.clear();
}
