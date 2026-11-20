import { useQuery } from "@tanstack/react-query";
import { listarMembresiasSocio } from "@/api/membresias.api";

export function useMembresiasSocio(socioId: string) {
  return useQuery({
    queryKey: ["membresias", "socio", socioId],
    queryFn: () => listarMembresiasSocio(socioId),
    enabled: Boolean(socioId),
  });
}
