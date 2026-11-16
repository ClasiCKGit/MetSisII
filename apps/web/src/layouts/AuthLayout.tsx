import { Outlet } from "react-router-dom";
import { Logo } from "@/components/shared/Logo";

/**
 * Pantallas públicas (login, registro) a pantalla dividida: a la izquierda el panel de marca y a
 * la derecha el formulario. En el celular el panel queda arriba, más bajo.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* Va a llevar una foto de entrenamiento de fondo; mientras tanto, la trama de franjas */}
      <section
        aria-hidden="true"
        className="relative flex min-h-56 flex-col justify-between gap-10 overflow-hidden bg-card bg-[repeating-linear-gradient(135deg,#1a1a1d_0_22px,#141416_22px_44px)] p-6 sm:p-10 lg:min-h-svh lg:flex-1 lg:p-12"
      >
        <Logo />
        <div className="flex max-w-xl flex-col gap-4">
          <p className="font-heading text-4xl leading-[0.95] font-black tracking-tight uppercase sm:text-5xl lg:text-7xl">
            Tu gimnasio,
            <br />
            <span className="text-primary">a full.</span>
          </p>
          <p className="max-w-md text-base text-muted-foreground sm:text-lg">
            Socios, profesores, actividades y pagos en un solo lugar.
          </p>
        </div>
      </section>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-12">
        <Outlet />
      </main>
    </div>
  );
}
