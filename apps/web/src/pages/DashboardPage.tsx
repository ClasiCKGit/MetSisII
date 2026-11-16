import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRightIcon,
  ContactIcon,
  DumbbellIcon,
  IdCardIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Link } from "react-router-dom";
import { useResumen } from "@/features/dashboard/hooks/useResumen";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";

interface TarjetaMetricaProps {
  titulo: string;
  icono: LucideIcon;
  // Sin valor (cargando, con error o sin módulo que la alimente) se muestra un guion
  valor?: number;
  detalle: string;
}

/** Tarjeta de una métrica del gimnasio: el número grande y, debajo, qué significa o por qué falta. */
function TarjetaMetrica({ titulo, icono: Icono, valor, detalle }: TarjetaMetricaProps) {
  return (
    <article aria-label={titulo} className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="rotulo text-card-foreground/80">{titulo}</h2>
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Icono aria-hidden="true" className="size-5" />
        </span>
      </div>
      <p
        className={cn(
          "font-heading text-6xl leading-none font-black tracking-tight tabular-nums",
          valor === undefined && "text-muted-foreground"
        )}
      >
        {valor ?? "—"}
      </p>
      <p className="text-sm text-muted-foreground">{detalle}</p>
    </article>
  );
}

/** Texto de la tarjeta de socios según el estado de la consulta. */
function detalleSocios(cargando: boolean, error: unknown): string {
  if (cargando) return "Cargando…";
  if (error) return `No se pudo calcular: ${getErrorMessage(error)}`;
  return "Socios que no están dados de baja.";
}

interface AccesoRapidoProps {
  to: string;
  etiqueta: string;
  icono: LucideIcon;
}

/** Enlace grande a una sección, para las tareas más frecuentes. */
function AccesoRapido({ to, etiqueta, icono: Icono }: AccesoRapidoProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3.5 rounded-xl border bg-card p-4 font-bold transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Icono aria-hidden="true" className="size-5" />
      </span>
      <span className="flex-1">{etiqueta}</span>
      <ChevronRightIcon aria-hidden="true" className="size-5 text-muted-foreground" />
    </Link>
  );
}

export function DashboardPage() {
  // Dos selectores separados que devuelven valores simples: no hace falta useShallow
  const nombre = useAuthStore((state) => state.usuario?.nombre);
  const rol = useAuthStore((state) => state.usuario?.rol);
  const resumen = useResumen();
  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <>
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold tracking-widest text-primary uppercase">{hoy}</span>
        <h1 className="titulo-pantalla">Hola, {nombre}</h1>
        <p className="text-sm text-muted-foreground">
          Ingresaste como {rol === "ADMIN" ? "administrador" : "recepcionista"}.
        </p>
      </header>

      <section aria-label="Métricas del gimnasio" className="grid gap-5 lg:grid-cols-2">
        <TarjetaMetrica
          titulo="Socios activos"
          icono={IdCardIcon}
          valor={resumen.data?.sociosActivos}
          detalle={detalleSocios(resumen.isPending, resumen.error)}
        />
        <TarjetaMetrica
          titulo="Ingresos del mes"
          icono={WalletIcon}
          detalle="Se va a calcular cuando esté disponible el registro de pagos."
        />
      </section>

      <section aria-labelledby="accesos-rapidos" className="flex flex-col gap-3.5">
        <h2 id="accesos-rapidos" className="rotulo">
          Accesos rápidos
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          <AccesoRapido to="/socios" etiqueta="Ver socios" icono={IdCardIcon} />
          {rol === "ADMIN" && (
            <AccesoRapido to="/usuarios" etiqueta="Gestionar usuarios" icono={UsersIcon} />
          )}
          <AccesoRapido to="/profesores" etiqueta="Ver profesores" icono={ContactIcon} />
          <AccesoRapido to="/actividades" etiqueta="Ver actividades" icono={DumbbellIcon} />
        </div>
      </section>
    </>
  );
}
