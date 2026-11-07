import type { RouteObject } from "react-router-dom";
import { GuestOnly, RequireAuth, RequireRole } from "@/features/auth/components/guards";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { UsuariosPage } from "@/pages/UsuariosPage";

// Las rutas se declaran como datos (no se crea el router acá) para poder reutilizarlas en main.tsx
// con createBrowserRouter, y en los tests con createMemoryRouter.
export const routes: RouteObject[] = [
  {
    // Solo sin sesión
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: "/login", element: <LoginPage /> }],
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
            // Solo administradores
            element: <RequireRole roles={["ADMIN"]} />,
            children: [{ path: "usuarios", element: <UsuariosPage /> }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];
