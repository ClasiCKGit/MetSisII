import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import { AuthBootstrap } from "@/features/auth/components/AuthBootstrap";
import { queryClient } from "@/lib/query-client";
import { routes } from "@/routes";

// Las pantallas se cargan de forma diferida (lazy) en la app. En los tests se resuelven una sola
// vez antes de empezar (ver setup.ts), así cada pantalla está lista apenas se monta y los tests
// no dependen de cuánto tarda en llegar el archivo. La carga diferida en sí la prueban el build y
// los tests de Playwright (tests-e2e/).
let rutasCargadas: RouteObject[] | null = null;

async function sinDiferir(rutas: RouteObject[]): Promise<RouteObject[]> {
  return Promise.all(
    rutas.map(async (ruta) => {
      const { lazy, children, ...resto } = ruta;
      const cargada = typeof lazy === "function" ? await lazy() : {};
      return {
        ...resto,
        ...cargada,
        // Ya cargada, no hay nada que esperar
        HydrateFallback: undefined,
        ...(children ? { children: await sinDiferir(children) } : {}),
      } as RouteObject;
    })
  );
}

export async function cargarRutas(): Promise<void> {
  rutasCargadas ??= await sinDiferir(routes);
}

// Monta la app completa (mismo árbol que main.tsx) en la ruta indicada
export function renderApp(path = "/") {
  if (!rutasCargadas) throw new Error("Falta cargarRutas() en tests/setup.ts");
  const router = createMemoryRouter(rutasCargadas, { initialEntries: [path] });
  const user = userEvent.setup();

  render(
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster />
    </QueryClientProvider>
  );

  return { router, user };
}

export type Usuario = ReturnType<typeof userEvent.setup>;
