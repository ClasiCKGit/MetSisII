import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClockIcon,
  ChevronRightIcon,
  ContactIcon,
  DumbbellIcon,
  IdCardIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import type { UseQueryResult } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { Membresia } from "@/api/membresias.api";
import { useResumen } from "@/features/dashboard/hooks/useResumen";
import {
  useMembresiasVencidas,
  useVencimientosProximos,
} from "@/features/dashboard/hooks/useVencimientosProximos";
import { formatearMonto } from "@/features/pagos/formato";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";

interface TarjetaMetricaProps {
  titulo: string;
  icono: LucideIcon;
  // Sin valor (cargando o con error) se muestra un guion
  valor?: number | string;
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
          "font-heading leading-none font-black tracking-tight tabular-nums",
          // Los montos son más largos que un conteo: van más chicos para no desbordar la tarjeta
          typeof valor === "string" ? "text-4xl break-all" : "text-6xl",
          valor === undefined && "text-muted-foreground"
        )}
      >
        {valor ?? "—"}
      </p>
      <p className="text-sm text-muted-foreground">{detalle}</p>
    </article>
  );
}

/** Texto de una tarjeta según el estado de la consulta: cargando, error o qué significa el número. */
function detalleMetrica(cargando: boolean, error: unknown, significado: string): string {
  if (cargando) return "Cargando…";
  if (error) return `No se pudo calcular: ${getErrorMessage(error)}`;
  return significado;
}

// La fecha de fin se compara por día UTC (igual que la vigencia en la API)
function formatearVencimiento(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

interface ListaDeMembresiasProps {
  id: string;
  titulo: string;
  // Nombre accesible de la lista
  etiqueta: string;
  vacio: string;
  // "Vence el" o "Venció el"
  textoFecha: string;
  // Color del texto de la fecha: aviso o urgencia
  claseFecha: string;
  consulta: UseQueryResult<Membresia[]>;
}

/** Membresías que requieren contactar al socio, con enlace al detalle de cada uno. */
function ListaDeMembresias({
  id,
  titulo,
  etiqueta,
  vacio,
  textoFecha,
  claseFecha,
  consulta,
}: ListaDeMembresiasProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5">
      <h2 id={id} className="rotulo">
        {titulo}
      </h2>
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        {consulta.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando…
          </p>
        ) : consulta.error ? (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(consulta.error)}
          </p>
        ) : consulta.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{vacio}</p>
        ) : (
          <ul aria-label={etiqueta} className="divide-y">
            {consulta.data.map((membresia) => (
              <li
                key={membresia.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    to={`/socios/${membresia.socio.id}`}
                    className="font-semibold hover:text-primary hover:underline"
                  >
                    {membresia.socio.apellido}, {membresia.socio.nombre}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {membresia.actividad.nombre} · {membresia.tipoMembresia.nombre}
                  </p>
                </div>
                <span className={cn("text-sm font-medium", claseFecha)}>
                  {textoFecha} {formatearVencimiento(membresia.fechaFin)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
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
  const vencimientos = useVencimientosProximos();
  const vencidas = useMembresiasVencidas();
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

      <section
        aria-label="Métricas del gimnasio"
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        <TarjetaMetrica
          titulo="Socios activos"
          icono={IdCardIcon}
          valor={resumen.data?.sociosActivos}
          detalle={detalleMetrica(
            resumen.isPending,
            resumen.error,
            "Socios que no están dados de baja."
          )}
        />
        <TarjetaMetrica
          titulo="Ingresos del mes"
          icono={WalletIcon}
          valor={resumen.data && formatearMonto(resumen.data.ingresosMes)}
          detalle={detalleMetrica(
            resumen.isPending,
            resumen.error,
            "Pagos cobrados en el mes calendario en curso."
          )}
        />
        <TarjetaMetrica
          titulo="Vencimientos próximos"
          icono={CalendarClockIcon}
          valor={resumen.data?.vencimientosProximos}
          detalle={detalleMetrica(
            resumen.isPending,
            resumen.error,
            "Membresías que vencen hoy o en los próximos 7 días."
          )}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ListaDeMembresias
          id="vencimientos-proximos"
          titulo="Vencen en los próximos 7 días"
          etiqueta="Membresías por vencer"
          vacio="No hay membresías por vencer en los próximos 7 días."
          textoFecha="Vence el"
          claseFecha="text-warning"
          consulta={vencimientos}
        />
        <ListaDeMembresias
          id="membresias-vencidas"
          titulo="Vencidas sin renovar"
          etiqueta="Membresías vencidas"
          vacio="No hay membresías vencidas sin renovar."
          textoFecha="Venció el"
          claseFecha="text-destructive"
          consulta={vencidas}
        />
      </div>

      <section aria-labelledby="accesos-rapidos" className="flex flex-col gap-3.5">
        <h2 id="accesos-rapidos" className="rotulo">
          Accesos rápidos
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          <AccesoRapido to="/socios" etiqueta="Ver socios" icono={IdCardIcon} />
          <AccesoRapido to="/pagos" etiqueta="Ver pagos" icono={WalletIcon} />
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
