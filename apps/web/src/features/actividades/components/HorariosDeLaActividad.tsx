import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { SelectField, TextField } from "@/components/shared/form-fields";
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
import { getErrorMessage } from "@/lib/api-error";
import {
  useActualizarHorario,
  useCrearHorario,
  useEliminarHorario,
  useHorariosDeActividad,
} from "../hooks/useHorarios";
import { useProfesoresDeActividad } from "../hooks/useProfesoresDeActividad";
import { aPayloadDeHorario, horarioSchema, type HorarioInput } from "../schemas";
import { DIAS_SEMANA, type Actividad, type DiaSemana, type Horario } from "../types";

const NOMBRE_DEL_DIA: Record<DiaSemana, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

const OPCIONES_DE_DIA = [
  { value: "", label: "Elegí el día" },
  ...DIAS_SEMANA.map((dia) => ({ value: dia, label: NOMBRE_DEL_DIA[dia] })),
];

const describir = (horario: Horario) =>
  `${NOMBRE_DEL_DIA[horario.diaSemana]} de ${horario.horaInicio} a ${horario.horaFin}`;

// Nombre del profesor de cada asignación de la actividad (el horario guarda el id de la asignación)
function useNombresDeProfesores(actividadId: string) {
  const { data: vinculos } = useProfesoresDeActividad(actividadId);
  const nombres = new Map(
    (vinculos ?? []).map((v) => [v.id, `${v.profesor.nombre} ${v.profesor.apellido}`])
  );
  return { vinculos, nombres };
}

function HorarioForm({
  actividad,
  horario,
  onDone,
}: {
  actividad: Actividad;
  // Sin horario es un alta; con horario, una edición
  horario: Horario | null;
  onDone: () => void;
}) {
  const crear = useCrearHorario(actividad.id);
  const actualizar = useActualizarHorario(actividad.id);
  const mutacion = horario ? actualizar : crear;
  const { vinculos } = useNombresDeProfesores(actividad.id);

  const form = useForm<HorarioInput>({
    resolver: zodResolver(horarioSchema),
    defaultValues: {
      diaSemana: horario?.diaSemana ?? ("" as DiaSemana),
      horaInicio: horario?.horaInicio ?? "",
      horaFin: horario?.horaFin ?? "",
      actividadProfesorId: horario?.actividadProfesorId ?? "",
    },
  });

  const opcionesDeProfesor = [
    { value: "", label: "Sin profesor asignado" },
    ...(vinculos ?? []).map((v) => ({
      value: v.id,
      label: `${v.profesor.nombre} ${v.profesor.apellido}`,
    })),
  ];

  function enviar(valores: HorarioInput) {
    const payload = aPayloadDeHorario(horarioSchema.parse(valores));
    const alTerminar = {
      onSuccess: () => {
        toast.add({
          type: "success",
          title: horario ? "Horario actualizado" : "Horario agregado",
          description: `${NOMBRE_DEL_DIA[payload.diaSemana]} de ${payload.horaInicio} a ${payload.horaFin}`,
        });
        onDone();
      },
    };
    if (horario) {
      actualizar.mutate({ id: horario.id, cambios: payload }, alTerminar);
    } else {
      crear.mutate(payload, alTerminar);
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>{horario ? "Editar horario" : "Nuevo horario"}</DialogTitle>
        <DialogDescription>
          Un turno semanal de {actividad.nombre}. Las horas van en formato de 24 horas.
        </DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <FieldGroup>
          <SelectField
            control={form.control}
            name="diaSemana"
            label="Día"
            options={OPCIONES_DE_DIA}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              control={form.control}
              name="horaInicio"
              label="Desde"
              placeholder="18:00"
              inputMode="numeric"
              autoComplete="off"
            />
            <TextField
              control={form.control}
              name="horaFin"
              label="Hasta"
              placeholder="19:00"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
          <SelectField
            control={form.control}
            name="actividadProfesorId"
            label="Profesor"
            description="Solo aparecen los profesores asignados a esta actividad."
            options={opcionesDeProfesor}
          />
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
          {mutacion.isPending ? "Guardando…" : horario ? "Guardar cambios" : "Agregar horario"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function BorrarHorarioDialog({
  actividadId,
  horario,
  onCerrar,
}: {
  actividadId: string;
  horario: Horario | null;
  onCerrar: () => void;
}) {
  const eliminar = useEliminarHorario(actividadId);

  function borrar() {
    if (!horario) return;
    eliminar.mutate(horario.id, {
      onSuccess: () => {
        toast.add({ type: "success", title: "Horario borrado", description: describir(horario) });
        onCerrar();
      },
    });
  }

  return (
    <Dialog open={horario !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar horario</DialogTitle>
          <DialogDescription>
            {horario && `¿Borrar el turno del ${describir(horario).toLowerCase()}? `}
            No se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {eliminar.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(eliminar.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button variant="destructive" onClick={borrar} disabled={eliminar.isPending}>
            {eliminar.isPending ? "Borrando…" : "Borrar horario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// El formulario se monta recién al abrir: así cada apertura arranca con los valores del horario elegido
type Edicion = { tipo: "nuevo" } | { tipo: "editar"; horario: Horario } | null;

export function HorariosDeLaActividad({
  actividad,
  puedeEditar,
}: {
  actividad: Actividad;
  puedeEditar: boolean;
}) {
  const tituloId = useId();
  const {
    data: horarios,
    isPending,
    error,
    refetch,
    isFetching,
  } = useHorariosDeActividad(actividad.id);
  const { nombres } = useNombresDeProfesores(actividad.id);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [borrando, setBorrando] = useState<Horario | null>(null);

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={tituloId} className="font-heading text-lg font-black tracking-tight uppercase">
          Horarios
        </h2>
        {puedeEditar && actividad.activa && (
          <Button size="sm" onClick={() => setEdicion({ tipo: "nuevo" })}>
            Agregar horario
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        {isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando horarios…
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

        {horarios && horarios.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay horarios cargados para esta actividad.
          </p>
        )}

        {horarios && horarios.length > 0 && (
          <ul className="divide-y">
            {horarios.map((horario) => (
              <li key={horario.id} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <div className="font-semibold">
                    {NOMBRE_DEL_DIA[horario.diaSemana]} · {horario.horaInicio} a {horario.horaFin}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {/* Mientras llegan los profesores no se muestra nada, para no parpadear */}
                    {horario.actividadProfesorId
                      ? (nombres.get(horario.actividadProfesorId) ?? "")
                      : "Sin profesor asignado"}
                  </div>
                </div>
                {puedeEditar && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar el horario del ${describir(horario).toLowerCase()}`}
                      onClick={() => setEdicion({ tipo: "editar", horario })}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Borrar el horario del ${describir(horario).toLowerCase()}`}
                      onClick={() => setBorrando(horario)}
                    >
                      Borrar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {puedeEditar && horarios && !actividad.activa && (
          <p className="text-sm text-muted-foreground">
            La actividad está dada de baja: no se pueden agregar horarios.
          </p>
        )}
      </div>

      {puedeEditar && (
        <>
          <Dialog open={edicion !== null} onOpenChange={(abierto) => !abierto && setEdicion(null)}>
            <DialogContent>
              {edicion && (
                <HorarioForm
                  actividad={actividad}
                  horario={edicion.tipo === "editar" ? edicion.horario : null}
                  onDone={() => setEdicion(null)}
                />
              )}
            </DialogContent>
          </Dialog>
          <BorrarHorarioDialog
            actividadId={actividad.id}
            horario={borrando}
            onCerrar={() => setBorrando(null)}
          />
        </>
      )}
    </section>
  );
}
