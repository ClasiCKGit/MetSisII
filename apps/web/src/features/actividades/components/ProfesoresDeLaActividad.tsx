import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Iniciales } from "@/components/shared/Iniciales";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { useProfesores } from "@/features/profesores/hooks/useProfesores";
import { getErrorMessage } from "@/lib/api-error";
import {
  useDesvincularProfesor,
  useProfesoresDeActividad,
  useVincularProfesor,
} from "../hooks/useProfesoresDeActividad";
import type { Actividad, VinculoProfesor } from "../types";

const nombreDe = (vinculo: VinculoProfesor) =>
  `${vinculo.profesor.nombre} ${vinculo.profesor.apellido}`;

function AsignarProfesor({
  actividadId,
  vinculados,
}: {
  actividadId: string;
  vinculados: VinculoProfesor[];
}) {
  const selectId = useId();
  const { data: profesores } = useProfesores();
  const vincular = useVincularProfesor(actividadId);
  const [elegido, setElegido] = useState("");

  // Mientras la lista no llega no se muestra nada: así no parpadea "no hay profesores disponibles"
  if (!profesores) return null;

  // Solo se ofrecen los profesores en actividad que todavía no la dan
  const yaAsignados = new Set(vinculados.map((v) => v.profesorId));
  const disponibles = profesores.filter((p) => p.activo && !yaAsignados.has(p.id));

  function asignar() {
    const profesor = disponibles.find((p) => p.id === elegido);
    if (!profesor) return;

    vincular.mutate(profesor.id, {
      onSuccess: () => {
        toast.add({
          type: "success",
          title: "Profesor asignado",
          description: `${profesor.nombre} ${profesor.apellido}`,
        });
        setElegido("");
      },
      onError: (error) =>
        toast.add({
          type: "error",
          title: "No se pudo asignar el profesor",
          description: getErrorMessage(error),
        }),
    });
  }

  if (disponibles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay profesores disponibles para asignar.</p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-medium">
          Asignar un profesor
        </label>
        <NativeSelect id={selectId} value={elegido} onChange={(e) => setElegido(e.target.value)}>
          <NativeSelectOption value="">Elegí un profesor</NativeSelectOption>
          {disponibles.map((profesor) => (
            <NativeSelectOption key={profesor.id} value={profesor.id}>
              {profesor.nombre} {profesor.apellido}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button onClick={asignar} disabled={!elegido || vincular.isPending}>
        {vincular.isPending ? "Asignando…" : "Asignar"}
      </Button>
    </div>
  );
}

function QuitarProfesorDialog({
  actividad,
  vinculo,
  onCerrar,
}: {
  actividad: Actividad;
  vinculo: VinculoProfesor | null;
  onCerrar: () => void;
}) {
  const desvincular = useDesvincularProfesor(actividad.id);

  function quitar() {
    if (!vinculo) return;
    desvincular.mutate(vinculo.profesorId, {
      onSuccess: () => {
        toast.add({ type: "success", title: "Profesor quitado", description: nombreDe(vinculo) });
        onCerrar();
      },
    });
  }

  return (
    <Dialog open={vinculo !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quitar profesor</DialogTitle>
          <DialogDescription>
            {vinculo && `¿Quitar a ${nombreDe(vinculo)} de ${actividad.nombre}? `}
            Los horarios que tenía asignados quedan sin profesor.
          </DialogDescription>
        </DialogHeader>

        {desvincular.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(desvincular.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button variant="destructive" onClick={quitar} disabled={desvincular.isPending}>
            {desvincular.isPending ? "Quitando…" : "Quitar profesor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProfesoresDeLaActividad({
  actividad,
  puedeEditar,
}: {
  actividad: Actividad;
  puedeEditar: boolean;
}) {
  const tituloId = useId();
  const {
    data: vinculos,
    isPending,
    error,
    refetch,
    isFetching,
  } = useProfesoresDeActividad(actividad.id);
  const [quitando, setQuitando] = useState<VinculoProfesor | null>(null);

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-3">
      <h2 id={tituloId} className="font-heading text-lg font-black tracking-tight uppercase">
        Profesores
      </h2>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        {isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando profesores…
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

        {vinculos && vinculos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay profesores asignados a esta actividad.
          </p>
        )}

        {vinculos && vinculos.length > 0 && (
          <ul className="divide-y">
            {vinculos.map((vinculo) => (
              <li key={vinculo.id} className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-2.5">
                  <Iniciales
                    nombre={vinculo.profesor.nombre}
                    apellido={vinculo.profesor.apellido}
                  />
                  <div>
                    <div className="font-semibold">{nombreDe(vinculo)}</div>
                    {vinculo.profesor.especialidad && (
                      <div className="text-xs text-muted-foreground">
                        {vinculo.profesor.especialidad}
                      </div>
                    )}
                  </div>
                </div>
                {puedeEditar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Quitar a ${nombreDe(vinculo)}`}
                    onClick={() => setQuitando(vinculo)}
                  >
                    Quitar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {puedeEditar && vinculos && !actividad.activa && (
          <p className="text-sm text-muted-foreground">
            La actividad está dada de baja: no se pueden asignar profesores.
          </p>
        )}
        {puedeEditar && vinculos && actividad.activa && (
          <AsignarProfesor actividadId={actividad.id} vinculados={vinculos} />
        )}
      </div>

      {puedeEditar && (
        <QuitarProfesorDialog
          actividad={actividad}
          vinculo={quitando}
          onCerrar={() => setQuitando(null)}
        />
      )}
    </section>
  );
}
