import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/api-error";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Un error del cliente (4xx) no se arregla reintentando: solo se reintenta
      // ante errores del servidor o de red, y hasta 2 veces.
      retry: (failureCount, error) => {
        const esErrorDelCliente =
          error instanceof ApiError && error.status !== null && error.status < 500;
        return !esErrorDelCliente && failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
