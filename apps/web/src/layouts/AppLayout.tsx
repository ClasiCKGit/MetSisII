import { cn } from "cn";
import {
  ContactIcon,
  DumbbellIcon,
  HouseIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Iniciales } from "@/components/shared/Iniciales";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import type { Rol } from "@/features/auth/types";
import { ChangePasswordDialog } from "@/features/auth/components/ChangePasswordDialog";
import { cerrarSesion } from "@/features/auth/session";
import { useAuthStore } from "@/store/auth.store";
import { useBarraContraida } from "./useBarraContraida";

interface ItemMenu {
  to: string;
  etiqueta: string;
  icono: LucideIcon;
  // Sin roles, lo ve cualquier usuario con sesión
  roles?: Rol[];
}

const MENU: ItemMenu[] = [
  { to: "/", etiqueta: "Inicio", icono: HouseIcon },
  { to: "/usuarios", etiqueta: "Usuarios", icono: UsersIcon, roles: ["ADMIN"] },
  { to: "/profesores", etiqueta: "Profesores", icono: ContactIcon },
  { to: "/actividades", etiqueta: "Actividades", icono: DumbbellIcon },
];

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
  const { contraida, alternar } = useBarraContraida();

  const items = MENU.filter((item) => !item.roles || (usuario && item.roles.includes(usuario.rol)));
  // La barra solo se contrae en pantallas medianas o más; en el celular va arriba, completa.
  // sr-only (y no ocultar) mantiene el texto para lectores de pantalla y nombres accesibles.
  const ocultoSiContraida = contraida ? "md:sr-only" : undefined;

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside
        className={cn(
          "flex shrink-0 flex-col gap-4 border-b border-sidebar-border bg-sidebar p-3 md:sticky md:top-0 md:h-svh md:gap-6 md:overflow-y-auto md:border-r md:border-b-0 md:px-3.5 md:py-5",
          contraida ? "md:w-[76px]" : "md:w-64"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            contraida && "md:flex-col md:justify-start"
          )}
        >
          <Logo nombreClassName={ocultoSiContraida} />
          <Button
            variant="outline"
            size="icon"
            className="hidden md:inline-flex"
            onClick={alternar}
            aria-label={contraida ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!contraida}
            title={contraida ? "Expandir menú" : "Contraer menú"}
          >
            {contraida ? (
              <PanelLeftOpenIcon aria-hidden="true" />
            ) : (
              <PanelLeftCloseIcon aria-hidden="true" />
            )}
          </Button>
        </div>

        <div
          className={cn(
            "flex flex-col rounded-lg border bg-muted px-3 py-2",
            contraida && "md:hidden"
          )}
        >
          <span className="rotulo">Gimnasio</span>
          <span className="truncate text-sm font-bold">{gimnasio?.nombre}</span>
        </div>

        <nav
          aria-label="Principal"
          className="flex flex-wrap gap-1 md:flex-1 md:flex-col md:flex-nowrap"
        >
          {items.map(({ to, etiqueta, icono: Icono }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              title={contraida ? etiqueta : undefined}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  contraida && "md:justify-center md:px-0",
                  isActive &&
                    "bg-sidebar-primary font-bold text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                )
              }
            >
              <Icono aria-hidden="true" className="size-5 shrink-0" />
              <span className={ocultoSiContraida}>{etiqueta}</span>
            </NavLink>
          ))}
        </nav>

        <div
          className={cn(
            "flex items-center gap-2 border-t border-sidebar-border pt-3 md:pt-4",
            contraida && "md:flex-col"
          )}
        >
          <Iniciales nombre={usuario?.nombre ?? ""} apellido={usuario?.apellido} />
          <div className={cn("flex min-w-0 flex-1 flex-col", ocultoSiContraida)}>
            <span className="truncate text-sm font-semibold">
              {usuario?.nombre} {usuario?.apellido}
            </span>
          </div>
          <ChangePasswordDialog soloIcono />
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={cerrarSesion}
            aria-label="Salir"
            title="Salir"
          >
            <LogOutIcon aria-hidden="true" />
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 md:px-11 md:py-9">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
