import { NavLink, Outlet } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { cerrarSesion } from "@/features/auth/session";
import { cn } from "../../lib/utils";
import { useAuthStore } from "@/store/auth.store";

function enlace({ isActive }: { isActive: boolean }) {
  return cn(
    "text-sm text-muted-foreground hover:text-foreground",
    isActive && "font-semibold text-foreground"
  );
}

export function AppLayout() {
  // Se seleccionan DOS valores a la vez, así que el selector devuelve un objeto nuevo en cada
  // llamada. En Zustand 5 eso se debe envolver con useShallow, que compara el contenido y no
  // la identidad; sin él, React entra en un bucle infinito de renders.
  const { usuario, gimnasio } = useAuthStore(
    useShallow((state) => ({
      usuario: state.usuario,
      gimnasio: state.gimnasio,
    }))
  );

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <nav aria-label="Principal" className="flex items-center gap-4">
            <span className="font-semibold">FitManager</span>
            <NavLink to="/" end className={enlace}>
              Inicio
            </NavLink>
            {usuario?.rol === "ADMIN" && (
              <NavLink to="/usuarios" className={enlace}>
                Usuarios
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {gimnasio?.nombre} · {usuario?.nombre} {usuario?.apellido}
            </span>
            <Button variant="outline" size="sm" onClick={cerrarSesion}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
