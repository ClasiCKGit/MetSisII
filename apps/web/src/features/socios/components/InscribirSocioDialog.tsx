import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm, useWatch } from "react-hook-form";
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
import { useActividades } from "@/features/actividades/hooks/useActividades";
import { formatearMonto, METODO_PAGO_LABEL } from "@/features/pagos/formato";
import { getErrorMessage } from "@/lib/api-error";
import { useInscribirSocio, useTiposMembresia } from "../hooks/useInscripcion";
import {
  aFechaInicioIso,
  inscripcionSchema,
  METODOS_PAGO,
  type InscripcionFormValues,
} from "../schemas";
import type { Socio } from "../types";

const OPCIONES_METODO = METODOS_PAGO.map((metodo) => ({
  value: metodo,
  label: METODO_PAGO_LABEL[metodo],
}));

function duracion(dias: number): string {
  return dias === 1 ? "1 día" : `${dias} días`;
}

function InscribirSocioForm({ socio, onDone }: { socio: Socio; onDone: () => void }) {
  const actividades = useActividades();
  const tipos = useTiposMembresia();
  const inscribir = useInscribirSocio();
  const form = useForm<InscripcionFormValues>({
    resolver: zodResolver(inscripcionSchema),
    defaultValues: {
      actividadId: "",
      tipoMembresiaId: "",
      metodoPago: "EFECTIVO",
      // El día de hoy en la hora local de quien inscribe
      fechaInicio: format(new Date(), "yyyy-MM-dd"),
    },
  });
  const [actividadId, tipoMembresiaId] = useWatch({
    control: form.control,
    name: ["actividadId", "tipoMembresiaId"],
  });

  const cargando = actividades.isPending || tipos.isPending;
  const errorAlCargar = actividades.error ?? tipos.error;

  // Solo se ofrece lo que la API acepta: actividades activas con algún tipo activo
  const tiposActivos = (tipos.data ?? []).filter((tipo) => tipo.activo);
  const actividadesConTipos = (actividades.data ?? []).filter(
    (actividad) => actividad.activa && tiposActivos.some((t) => t.actividadId === actividad.id)
  );
  const tiposDeLaActividad = tiposActivos.filter((tipo) => tipo.actividadId === actividadId);
  const tipoElegido = tiposDeLaActividad.find((tipo) => tipo.id === tipoMembresiaId);

  function enviar(valores: InscripcionFormValues) {
    inscribir.mutate(
      {
        socioId: socio.id,
        actividadId: valores.actividadId,
        tipoMembresiaId: valores.tipoMembresiaId,
        metodoPago: valores.metodoPago,
        fechaInicio: aFechaInicioIso(valores.fechaInicio),
      },
      {
        onSuccess: (inscripcion) => {
          toast.add({
            type: "success",
            title: "Socio inscripto",
            description: `${inscripcion.actividad.nombre}: pago pendiente de ${formatearMonto(inscripcion.pago.monto)}`,
          });
          onDone();
        },
      }
    );
  }

  let contenido;
  if (cargando) {
    contenido = (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando actividades…
      </p>
    );
  } else if (errorAlCargar) {
    contenido = (
      <p role="alert" className="text-sm text-destructive">
        {getErrorMessage(errorAlCargar)}
      </p>
    );
  } else if (actividadesConTipos.length === 0) {
    contenido = (
      <p className="text-sm text-muted-foreground">
        No hay actividades activas con tipos de membresía. Un administrador tiene que cargarlos
        antes de inscribir socios.
      </p>
    );
  } else {
    contenido = (
      <>
        <FieldGroup>
          <SelectField
            control={form.control}
            name="actividadId"
            label="Actividad"
            options={[
              { value: "", label: "Elegí una actividad" },
              ...actividadesConTipos.map((actividad) => ({
                value: actividad.id,
                label: actividad.nombre,
              })),
            ]}
            // El tipo elegido pertenece a la actividad anterior
            onValueChange={() => form.resetField("tipoMembresiaId")}
          />
          <SelectField
            control={form.control}
            name="tipoMembresiaId"
            label="Tipo de membresía"
            disabled={!actividadId}
            options={[
              {
                value: "",
                label: actividadId ? "Elegí el tipo" : "Primero elegí la actividad",
              },
              ...tiposDeLaActividad.map((tipo) => ({
                value: tipo.id,
                label: `${tipo.nombre} · ${formatearMonto(tipo.precio)} · ${duracion(tipo.duracionDias)}`,
              })),
            ]}
          />
          <SelectField
            control={form.control}
            name="metodoPago"
            label="Método de pago"
            options={OPCIONES_METODO}
            description={
              tipoElegido
                ? `Se registra un pago pendiente de ${formatearMonto(tipoElegido.precio)}.`
                : "Se registra un pago pendiente por el precio del tipo de membresía."
            }
          />
          <TextField
            control={form.control}
            name="fechaInicio"
            label="Fecha de inicio"
            type="date"
          />
        </FieldGroup>
        {inscribir.error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {getErrorMessage(inscribir.error)}
          </p>
        )}
      </>
    );
  }

  const listo = !cargando && !errorAlCargar && actividadesConTipos.length > 0;

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Inscribir a una actividad</DialogTitle>
        <DialogDescription>
          {socio.nombre} {socio.apellido}
        </DialogDescription>
      </DialogHeader>

      <div className="my-4">{contenido}</div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        {listo && (
          <Button type="submit" disabled={inscribir.isPending}>
            {inscribir.isPending ? "Inscribiendo…" : "Inscribir"}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

export function InscribirSocioDialog({
  socio,
  abierto,
  onAbiertoChange,
}: {
  socio: Socio;
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent>
        {abierto && <InscribirSocioForm socio={socio} onDone={() => onAbiertoChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
