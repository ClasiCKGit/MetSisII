import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { USANDO_API_REAL } from "../helpers/modo";
import { server } from "../mocks/server";

const API = `${import.meta.env.VITE_API_URL}/api`;
const CORS = { "Access-Control-Allow-Origin": "*" };

function sesion(token: string) {
  useAuthStore.setState({
    token,
    usuario: { id: "u1", email: "ana@gym.com", nombre: "Ana", apellido: "Admin", rol: "ADMIN" },
    gimnasio: { id: "g1", nombre: "Gym", slug: "gym" },
  });
}

// Usa un endpoint inventado con MSW: no tiene sentido contra la API real
describe.skipIf(USANDO_API_REAL)("interceptor de 401", () => {
  it("un 401 que llega tarde, de una sesión anterior, no cierra la sesión actual", async () => {
    // La respuesta queda retenida hasta que se cambia de sesión. Se espera a que la petición
    // llegue al servidor: axios agrega el token en un paso asincrónico.
    let llego!: () => void;
    const recibida = new Promise<void>((resolve) => (llego = resolve));
    let responder!: () => void;
    const retenida = new Promise<void>((resolve) => (responder = resolve));
    server.use(
      http.get(`${API}/prueba-401`, async () => {
        llego();
        await retenida;
        return HttpResponse.json({ error: "Token inválido" }, { status: 401, headers: CORS });
      })
    );

    sesion("token-viejo");
    const peticion = apiClient.get("/prueba-401").catch(() => undefined);
    await recibida;
    sesion("token-nuevo");
    responder();
    await peticion;

    expect(useAuthStore.getState().token).toBe("token-nuevo");
  });

  it("un 401 de la sesión actual sí la cierra", async () => {
    server.use(
      http.get(`${API}/prueba-401`, () =>
        HttpResponse.json({ error: "Token inválido" }, { status: 401, headers: CORS })
      )
    );

    sesion("token-actual");
    await apiClient.get("/prueba-401").catch(() => undefined);

    expect(useAuthStore.getState().token).toBeNull();
  });
});
