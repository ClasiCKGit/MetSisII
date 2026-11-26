import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { EstadoActivo } from "@/components/shared/EstadoActivo";
import { TextField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type { TipoMembresia } from "@/api/tipos-membresia.api";
import { formatearMonto } from "@/features/pagos/formato";
import { getErrorMessage } from "@/lib/api-error";
import {
  useActualizarTipo,
  useCrearTipo,
  useDarDeBajaTipo,
  useTiposDeActividad,
} from "../hooks/useTiposDeActividad";
import { aPayloadDeTipo, tipoMembresiaSchema, type TipoMembresiaInput } from "../schemas";
import type { Actividad } from "../types";

const plural = (cantidad: number, singular: string, varios: string) =>
  `${cantidad} ${cantidad === 1 ? singular : varios}`;

function detalleDelTipo(tipo: TipoMembresia) {
  const clases =
    tipo.cantidadClases === null
      ? "clases ilimitadas"
      : plural(tipo.cantidadClases, "clase", "clases");
  return `${plural(tipo.duracionDias, "día", "días")} · ${clases}`;
}

function TipoForm({
  actividad,
  tipo,
  onDone,
}: {
  actividad: Actividad;
  // Sin tipo es un alta; con tipo, una edición
  tipo: TipoMembresia | null;
  onDone: () => void;
}) {
  const crear = useCrearTipo(actividad.id);
  const actualizar = useActualizarTipo();
  const mutacion = tipo ? actualizar : crear;

  const form = useForm<TipoMembresiaInput>({
    resolver: zodResolver(tipoMembresiaSchema),
    defaultValues: {
      nombre: tipo?.nombre ?? "",
      // La API devuelve "12500.5": en el formulario se muestra con coma decimal
      precio: tipo ? tipo.precio.replace(".", ",") : "",
      duracionDias: tipo ? String(tipo.duracionDias) : "",
      cantidadClases: tipo?.cantidadClases ? String(tipo.cantidadClases) : "",
    },
  });

  function enviar(valores: TipoMembresiaInput) {
    const payload = aPayloadDeTipo(valores);
    const alTerminar = {
      onSuccess: () => {
        toast.add({
          type: "success",
          title: tipo ? "Plan actualizado" : "Plan creado",
          description: payload.nombre,
        });
        onDone();
      },
    };
    if (tipo) {
      actualizar.mutate({ id: tipo.id, cambios: payload }, alTerminar);
    } else {
      crear.mutate(payload, alTerminar);
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>{tipo ? "Editar plan" : "Nuevo plan"}</DialogTitle>
        <DialogDescription>
          Un tipo de membresía de {actividad.nombre}, con su precio y duración.
          {tipo &&
            " El precio nuevo se cobra en las próximas inscripciones; las ya hechas no cambian."}
        </DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <FieldGroup>
          <TextField
            control={form.control}
            name="nombre"
            label="Nombre"
            placeholder="Mensual"
            autoComplete="off"
          />
          <TextField
            control={form.control}
            name="precio"
            label="Precio"
            description="En pesos, por ejemplo 12500 o 12500,50."
            inputMode="decimal"
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              control={form.control}
              name="duracionDias"
              label="Duración (días)"
              placeholder="30"
              inputMode="numeric"
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="cantidadClases"
              label="Cantidad de clases"
              description="Vacío: ilimitadas."
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
        </FieldGroup>
        {mutacion.error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {getErrorMessage(mutacion.error)}
          </p>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={mutacion.isPending}>
          {mutacion.isPending ? "Guardando…" : tipo ? "Guardar cambios" : "Crear plan"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CambiarEstadoDelTipoDialog({
  tipo,
  onCerrar,
}: {
  tipo: TipoMembresia | null;
  onCerrar: () => void;
}) {
  const darDeBaja = useDarDeBajaTipo();
  const actualizar = useActualizarTipo();
  const mutacion = tipo?.activo ? darDeBaja : actualizar;

  function confirmar() {
    if (!tipo) return;
    const alTerminar = {
      onSuccess: () => {
        toast.add({
          type: "success",
          title: tipo.activo ? "Plan dado de baja" : "Plan reactivado",
          description: tipo.nombre,
        });
        onCerrar();
      },
    };
    if (tipo.activo) {
      darDeBaja.mutate(tipo.id, alTerminar);
    } else {
      actualizar.mutate({ id: tipo.id, cambios: { activo: true } }, alTerminar);
    }
  }

  return (
    <Dialog open={tipo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tipo?.activo === false ? "Reactivar plan" : "Dar de baja el plan"}
          </DialogTitle>
          <DialogDescription>
            {tipo?.activo === false
              ? `¿Reactivar "${tipo.nombre}"? Se va a poder elegir de nuevo al inscribir.`
              : tipo &&
                `¿Dar de baja "${tipo.nombre}"? No se va a poder elegir en inscripciones nuevas. Las membresías que ya lo usan no cambian.`}
          </DialogDescription>
        </DialogHeader>

        {mutacion.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(mutacion.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button
            variant={tipo?.activo === false ? "default" : "destructive"}
            onClick={confirmar}
            disabled={mutacion.isPending}
          >
            {tipo?.activo === false ? "Reactivar" : "Dar de baja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Edicion = { tipo: TipoMembresia | null } | null;

export function TiposDeLaActividad({
  actividad,
  puedeEditar,
}: {
  actividad: Actividad;
  puedeEditar: boolean;
}) {
  const tituloId = useId();
  const { data: tipos, isPending, error, refetch, isFetching } = useTiposDeActividad(actividad.id);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState<TipoMembresia | null>(null);

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={tituloId} className="font-heading text-lg font-black tracking-tight uppercase">
          Planes y precios
        </h2>
        {puedeEditar && actividad.activa && (
          <Button size="sm" onClick={() => setEdicion({ tipo: null })}>
            Agregar plan
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        {isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando planes…
          </p>
        )}

        {error && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Reintentar
            </Button>
          </div>
        )}

        {tipos && tipos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay planes para esta actividad: sin un plan activo no se pueden inscribir
            socios.
          </p>
        )}

        {tipos && tipos.length > 0 && (
          <ul className="divide-y">
            {tipos.map((tipo) => (
              <li key={tipo.id} className="flex flex-wrap items-center justify-between gap-4 py-2">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">{tipo.nombre}</span>
                    <span className="font-semibold tabular-nums">
                      {formatearMonto(tipo.precio)}
                    </span>
                    {!tipo.activo && <EstadoActivo activo={false} />}
                  </div>
                  <div className="text-xs text-muted-foreground">{detalleDelTipo(tipo)}</div>
                </div>
                {puedeEditar && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar el plan ${tipo.nombre}`}
                      onClick={() => setEdicion({ tipo })}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${tipo.activo ? "Dar de baja" : "Reactivar"} el plan ${tipo.nombre}`}
                      onClick={() => setCambiandoEstado(tipo)}
                    >
                      {tipo.activo ? "Dar de baja" : "Reactivar"}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {puedeEditar && tipos && !actividad.activa && (
          <p className="text-sm text-muted-foreground">
            La actividad está dada de baja: no se pueden agregar planes.
          </p>
        )}
      </div>

      {puedeEditar && (
        <>
          <Dialog open={edicion !== null} onOpenChange={(abierto) => !abierto && setEdicion(null)}>
            <DialogContent>
              {edicion && (
                <TipoForm
                  actividad={actividad}
                  tipo={edicion.tipo}
                  onDone={() => setEdicion(null)}
                />
              )}
            </DialogContent>
          </Dialog>
          <CambiarEstadoDelTipoDialog
            tipo={cambiandoEstado}
            onCerrar={() => setCambiandoEstado(null)}
          />
        </>
      )}
    </section>
  );
}
