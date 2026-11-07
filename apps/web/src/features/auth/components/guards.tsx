import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { useAuthStatus, useAuthStore } from "@/store/auth.store";
import { getRedirectPath } from "../redirect";
import type { Rol } from "../types";

// Rutas que requieren sesión. Si no hay, se manda al login y se recuerda a dónde
// quería ir el usuario.
export function RequireAuth() {
  const status = useAuthStatus();
  const location = useLocation();

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

// Rutas solo para ciertos roles (el backend igual vuelve a verificarlo en cada request:
// esto solo evita mostrar una pantalla que después fallaría).
export function RequireRole({ roles }: { roles: Rol[] }) {
  const rol = useAuthStore((state) => state.usuario?.rol);

  if (!rol || !roles.includes(rol)) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}

// Rutas solo para quien NO tiene sesión (el login). Si ya la tiene, se lo redirige:
// esto también hace que, después de iniciar sesión, se pase solo a la página siguiente.
export function GuestOnly() {
  const status = useAuthStatus();
  const location = useLocation();

  if (status === "authenticated") {
    return <Navigate to={getRedirectPath(location.state)} replace />;
  }
  return <Outlet />;
}
