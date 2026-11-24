import { useQuery } from "@tanstack/react-query";
import { listarMembresiasSocio } from "@/api/membresias.api";

export const MEMBRESIAS_KEY = ["membresias"] as const;

export function useMembresiasSocio(socioId: string) {
  return useQuery({
    queryKey: [...MEMBRESIAS_KEY, "socio", socioId],
    queryFn: () => listarMembresiasSocio(socioId),
    enabled: Boolean(socioId),
  });
}
