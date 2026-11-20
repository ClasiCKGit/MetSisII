import { PencilIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { EstadoActivo } from "@/components/shared/EstadoActivo";
import { Iniciales } from "@/components/shared/Iniciales";
import { Button } from "@/components/ui/button";
import { getErrorMessage, hasStatus } from "@/lib/api-error";
import { EditarSocioDialog } from "../components/SocioDialogs";
import { useSocio } from "../hooks/useSocios";

const VOLVER = (
  <Link
    to="/socios"
    className="w-fit text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
  >
    ← Volver a socios
  </Link>
);

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="rotulo">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

/** Bloque del detalle con su título, en el mismo contenedor que las tablas. */
function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-black tracking-tight uppercase">{titulo}</h2>
      <div className="rounded-xl border bg-card p-4 sm:p-5">{children}</div>
    </section>
  );
}

// La fecha de nacimiento se guarda como medianoche UTC: se muestra en UTC para que
// en Argentina (UTC-3) no aparezca como el día anterior.
function formatearNacimiento(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

function formatearIngreso(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR");
}

export function SocioDetallePage() {
  const { id = "" } = useParams();
  const { data: socio, isPending, error, refetch, isFetching } = useSocio(id);
  const [editando, setEditando] = useState(false);

  if (isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando socio…
      </p>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">
          {hasStatus(error, 404) ? "No encontramos a ese socio." : getErrorMessage(error)}
        </p>
        {!hasStatus(error, 404) && (
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            Reintentar
          </Button>
        )}
        {VOLVER}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {VOLVER}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Iniciales
              nombre={socio.nombre}
              apellido={socio.apellido}
              className="size-12 text-base"
            />
            <h1 className="titulo-pantalla">
              {socio.nombre} {socio.apellido}
            </h1>
            <EstadoActivo activo={socio.activo} />
          </div>
          <Button size="lg" onClick={() => setEditando(true)}>
            <PencilIcon aria-hidden="true" />
            Editar
          </Button>
        </header>
      </div>

      <Seccion titulo="Datos personales">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Dato etiqueta="DNI" valor={socio.dni} />
          <Dato etiqueta="Email" valor={socio.email ?? "—"} />
          <Dato etiqueta="Teléfono" valor={socio.telefono ?? "—"} />
          <Dato etiqueta="Fecha de nacimiento" valor={formatearNacimiento(socio.fechaNacimiento)} />
          <Dato etiqueta="Fecha de ingreso" valor={formatearIngreso(socio.fechaIngreso)} />
        </dl>
      </Seccion>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Membresías">
          <p className="text-sm text-muted-foreground">
            Todavía no disponible: se completa cuando esté listo el módulo de membresías.
          </p>
        </Seccion>
        <Seccion titulo="Historial de pagos">
          <p className="text-sm text-muted-foreground">
            Todavía no disponible: se completa cuando esté listo el módulo de pagos.
          </p>
        </Seccion>
      </div>

      <EditarSocioDialog socio={editando ? socio : null} onCerrar={() => setEditando(false)} />
    </div>
  );
}
