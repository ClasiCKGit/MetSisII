import { PencilIcon, PlusIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { EstadoActivo } from "@/components/shared/EstadoActivo";
import { Iniciales } from "@/components/shared/Iniciales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccionesPagoPendiente } from "@/features/pagos/components/AccionesPagoPendiente";
import { EstadoPagoBadge } from "@/features/pagos/components/EstadoPagoBadge";
import {
  conceptoDePago,
  formatearFechaPago,
  formatearMonto,
  METODO_PAGO_LABEL,
} from "@/features/pagos/formato";
import { getErrorMessage, hasStatus } from "@/lib/api-error";
import { useMembresiasSocio } from "../hooks/useMembresiasSocio";
import { usePagosSocio } from "../hooks/usePagosSocio";
import type { MembresiaSocio } from "@/api/membresias.api";
import { InscribirSocioDialog } from "../components/InscribirSocioDialog";
import { useAuthStore } from "@/store/auth.store";
import { CancelarMembresiaDialog } from "../components/CancelarMembresiaDialog";
import { RenovarMembresiaDialog } from "../components/RenovarMembresiaDialog";
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

/** Bloque del detalle con su título (y una acción opcional), en el mismo contenedor que las tablas. */
function Seccion({
  titulo,
  accion,
  children,
}: {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-black tracking-tight uppercase">{titulo}</h2>
        {accion}
      </div>
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

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

/**
 * Las membresías que se pueden renovar: no canceladas, no renovadas, y la más reciente de su
 * actividad (una vencida vieja no se renueva si el socio ya se volvió a inscribir).
 */
function idsRenovables(membresias: MembresiaSocio[]): Set<string> {
  const ultimaPorActividad = new Map<string, MembresiaSocio>();
  for (const membresia of membresias) {
    if (membresia.estado === "CANCELADA") continue;
    const ultima = ultimaPorActividad.get(membresia.actividad.id);
    if (!ultima || membresia.fechaFin > ultima.fechaFin) {
      ultimaPorActividad.set(membresia.actividad.id, membresia);
    }
  }
  return new Set([...ultimaPorActividad.values()].filter((m) => !m.renovada).map((m) => m.id));
}

const ETIQUETAS_VIGENCIA = {
  AL_DIA: "Al día",
  POR_VENCER: "Por vencer",
  VENCIDA: "Vencida",
} as const;

function FilaMembresia({
  membresia,
  renovable,
  onRenovar,
  cancelable,
  onCancelar,
}: {
  membresia: MembresiaSocio;
  renovable: boolean;
  onRenovar: () => void;
  cancelable: boolean;
  onCancelar: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="font-medium">{membresia.actividad.nombre}</p>
        <p className="text-sm text-muted-foreground">
          {membresia.tipoMembresia.nombre} · vence el {formatearFecha(membresia.fechaFin)}
          {membresia.renovada && " · renovada"}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge
          variant="outline"
          className={
            membresia.estadoVigencia === "AL_DIA"
              ? "border-success/30 bg-success/10 text-success"
              : membresia.estadoVigencia === "POR_VENCER"
                ? "border-warning/30 bg-warning/10 text-warning"
                : membresia.estadoVigencia === "VENCIDA"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "text-muted-foreground"
          }
        >
          {membresia.estadoVigencia ? ETIQUETAS_VIGENCIA[membresia.estadoVigencia] : "Cancelada"}
        </Badge>
        {renovable && (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Renovar ${membresia.actividad.nombre}`}
            onClick={onRenovar}
          >
            Renovar
          </Button>
        )}
        {cancelable && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Cancelar ${membresia.actividad.nombre}`}
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        )}
      </div>
    </li>
  );
}

export function SocioDetallePage() {
  const { id = "" } = useParams();
  const { data: socio, isPending, error, refetch, isFetching } = useSocio(id);
  const membresiasQuery = useMembresiasSocio(id);
  const pagosQuery = usePagosSocio(id);
  const [editando, setEditando] = useState(false);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [renovando, setRenovando] = useState<MembresiaSocio | null>(null);
  const [cancelando, setCancelando] = useState<MembresiaSocio | null>(null);
  // Cancelar es solo de ADMIN (la API responde 403 a la recepción)
  const esAdmin = useAuthStore((state) => state.usuario?.rol === "ADMIN");

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
        <Seccion
          titulo="Membresías"
          accion={
            // Un socio dado de baja no se puede inscribir (la API responde 404)
            socio.activo && (
              <Button size="sm" onClick={() => setInscribiendo(true)}>
                <PlusIcon aria-hidden="true" />
                Inscribir
              </Button>
            )
          }
        >
          {membresiasQuery.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Cargando membresías…
            </p>
          ) : membresiasQuery.error ? (
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(membresiasQuery.error)}
            </p>
          ) : membresiasQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este socio todavía no tiene membresías.</p>
          ) : (
            <ul aria-label="Membresías del socio" className="divide-y">
              {membresiasQuery.data.map((membresia) => (
                <FilaMembresia
                  key={membresia.id}
                  membresia={membresia}
                  // Un socio dado de baja no se puede renovar (la API responde 404)
                  renovable={socio.activo && idsRenovables(membresiasQuery.data).has(membresia.id)}
                  onRenovar={() => setRenovando(membresia)}
                  cancelable={esAdmin && membresia.estado !== "CANCELADA"}
                  onCancelar={() => setCancelando(membresia)}
                />
              ))}
            </ul>
          )}
        </Seccion>
        <Seccion titulo="Historial de pagos">
          {pagosQuery.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Cargando pagos…
            </p>
          ) : pagosQuery.error ? (
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(pagosQuery.error)}
            </p>
          ) : pagosQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este socio todavía no tiene pagos.</p>
          ) : (
            <ul aria-label="Pagos del socio" className="divide-y">
              {pagosQuery.data.map((pago) => (
                <li
                  key={pago.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{conceptoDePago(pago)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatearFechaPago(pago.fecha)} · {METODO_PAGO_LABEL[pago.metodoPago]}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">
                        {formatearMonto(pago.monto)}
                      </span>
                      <EstadoPagoBadge estado={pago.estado} />
                    </div>
                    {pago.estado === "PENDIENTE" && (
                      <AccionesPagoPendiente pagoId={pago.id} concepto={conceptoDePago(pago)} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>

      <EditarSocioDialog socio={editando ? socio : null} onCerrar={() => setEditando(false)} />
      <RenovarMembresiaDialog membresia={renovando} onCerrar={() => setRenovando(null)} />
      <CancelarMembresiaDialog membresia={cancelando} onCerrar={() => setCancelando(null)} />
      <InscribirSocioDialog
        socio={socio}
        abierto={inscribiendo}
        onAbiertoChange={setInscribiendo}
      />
    </div>
  );
}
