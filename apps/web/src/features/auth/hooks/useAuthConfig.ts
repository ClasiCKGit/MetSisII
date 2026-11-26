import { useQuery } from "@tanstack/react-query";
import { getAuthConfig } from "@/api/auth.api";

/** Configuración pública de la API (por ejemplo, si se pueden registrar gimnasios). */
export function useAuthConfig() {
  return useQuery({
    queryKey: ["auth", "config"],
    queryFn: getAuthConfig,
    // Solo cambia si se reinicia la API con otras variables de entorno
    staleTime: Infinity,
  });
}
