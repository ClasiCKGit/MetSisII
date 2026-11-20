import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { toast } from "@/components/ui/toast";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";
import { USANDO_API_REAL } from "./helpers/modo";
import { restaurarServidor } from "./helpers/servidor";
import { resetFakeApi } from "./mocks/fake-api";
import { server } from "./mocks/server";

beforeAll(() => {
  // "error": una petición sin handler hace fallar el test, en vez de salir a la red sin avisar
  // (en MSW 3 la opción se llama onUnhandledFrame; el nombre viejo, onUnhandledRequest, se ignora)
  if (!USANDO_API_REAL) server.listen({ onUnhandledFrame: "error" });
});

// Todo lo que tiene estado global se limpia después de cada test, para que no dependan unos de otros
afterEach(() => {
  cleanup();
  restaurarServidor();
  toast.close(); // los avisos son un objeto global: sin esto, uno viejo aparecería en el test siguiente
  queryClient.clear();
  localStorage.clear();
  useAuthStore.setState({ token: null, usuario: null, gimnasio: null, ultimoSlug: "" });
  if (!USANDO_API_REAL) {
    server.resetHandlers();
    resetFakeApi();
  }
});

afterAll(() => {
  if (!USANDO_API_REAL) server.close();
});
