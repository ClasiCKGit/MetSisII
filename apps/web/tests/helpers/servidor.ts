import { http, HttpResponse } from "msw/http";
import { apiClient } from "@/lib/api-client";
import { USANDO_API_REAL } from "./modo";
import { API_ORIGIN, server } from "../mocks/server";

let restauracionPendiente: (() => void) | null = null;

// Simula que el servidor no responde. Devuelve la función que lo "vuelve a levantar".
// Si el test no la llama, setup.ts lo restaura solo al terminar (restaurarServidor).
export function simularServidorCaido(): () => void {
  const restaurar = USANDO_API_REAL
    ? (() => {
        const original = apiClient.defaults.baseURL;
        apiClient.defaults.baseURL = "http://localhost:3999/api"; // nadie escucha ahí
        return () => {
          apiClient.defaults.baseURL = original;
        };
      })()
    : (() => {
        server.use(http.all(`${API_ORIGIN}/api/*`, () => HttpResponse.error()));
        return () => server.resetHandlers();
      })();

  restauracionPendiente = restaurar;
  return () => {
    restaurar();
    restauracionPendiente = null;
  };
}

// Se llama después de cada test: un servidor "caído" nunca debe filtrarse al test siguiente
export function restaurarServidor(): void {
  restauracionPendiente?.();
  restauracionPendiente = null;
}
