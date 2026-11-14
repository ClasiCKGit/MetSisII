import type { RouteObject } from "react-router-dom";
import { GuestOnly, RequireAuth, RequireRole } from "@/features/auth/components/guards";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { UsuariosPage } from "@/features/usuarios/pages/UsuariosPage";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProfesoresPage } from "@/features/profesores/pages/ProfesoresPage";
import { ActividadesPage } from "@/features/actividades/pages/ActividadesPage";

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
          { path: "/registro", element: <RegisterPage /> },
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
            // Solo administradores
            element: <RequireRole roles={["ADMIN"]} />,
            children: [{ path: "usuarios", element: <UsuariosPage /> }],
          },
          { path: "profesores", element: <ProfesoresPage /> },
          { path: "actividades", element: <ActividadesPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];
