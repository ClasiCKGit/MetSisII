import { Outlet } from "react-router-dom";

// Contenedor centrado para las pantallas públicas (login, registro)
export function AuthLayout() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Outlet />
    </main>
  );
}
