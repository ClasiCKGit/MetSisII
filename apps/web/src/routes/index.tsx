import type { ComponentType } from "react";
import type { RouteObject } from "react-router-dom";
import { CargandoPantalla } from "@/components/shared/CargandoPantalla";
import { GuestOnly, RequireAuth, RequireRole } from "@/features/auth/components/guards";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

// Carga diferida: la pantalla (y lo que solo ella usa) va en un archivo aparte que el navegador
// descarga recién la primera vez que se abre. Login, inicio y 404 quedan en el bundle principal
// porque son lo primero que se ve. Mientras se descarga en la primera carga, se ve CargandoPantalla;
// al navegar, React Router mantiene la pantalla anterior hasta que la nueva está lista.
function diferida(
  cargar: () => Promise<ComponentType>
): Pick<RouteObject, "lazy" | "HydrateFallback"> {
  return {
    lazy: async () => ({ Component: await cargar() }),
    HydrateFallback: CargandoPantalla,
  };
}

// Las rutas se declaran como datos (no se crea el router acá) para poder reutilizarlas en main.tsx
// con createBrowserRouter, y en los tests con createMemoryRouter.
export const routes: RouteObject[] = [
  {
    // Solo sin sesión
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          {
            path: "/registro",
            ...diferida(
              async () => (await import("@/features/auth/pages/RegisterPage")).RegisterPage
            ),
          },
          {
            path: "/olvide-mi-contrasena",
            ...diferida(
              async () =>
                (await import("@/features/auth/pages/ForgotPasswordPage")).ForgotPasswordPage
            ),
          },
          {
            path: "/reset-password",
            ...diferida(
              async () =>
                (await import("@/features/auth/pages/ResetPasswordPage")).ResetPasswordPage
            ),
          },
        ],
      },
    ],
  },
  {
    // Solo con sesión
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: "socios",
            ...diferida(
              async () => (await import("@/features/socios/pages/SociosPage")).SociosPage
            ),
          },
          {
            path: "socios/:id",
            ...diferida(
              async () =>
                (await import("@/features/socios/pages/SocioDetallePage")).SocioDetallePage
            ),
          },
          {
            path: "pagos",
            ...diferida(async () => (await import("@/features/pagos/pages/PagosPage")).PagosPage),
          },
          {
            // Solo administradores
            element: <RequireRole roles={["ADMIN"]} />,
            children: [
              {
                path: "usuarios",
                ...diferida(
                  async () => (await import("@/features/usuarios/pages/UsuariosPage")).UsuariosPage
                ),
              },
              {
                path: "gimnasio",
                ...diferida(
                  async () => (await import("@/features/gimnasio/pages/GimnasioPage")).GimnasioPage
                ),
              },
            ],
          },
          {
            path: "profesores",
            ...diferida(
              async () =>
                (await import("@/features/profesores/pages/ProfesoresPage")).ProfesoresPage
            ),
          },
          {
            path: "actividades",
            ...diferida(
              async () =>
                (await import("@/features/actividades/pages/ActividadesPage")).ActividadesPage
            ),
          },
          {
            path: "actividades/:id",
            ...diferida(
              async () =>
                (await import("@/features/actividades/pages/ActividadDetallePage"))
                  .ActividadDetallePage
            ),
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];
