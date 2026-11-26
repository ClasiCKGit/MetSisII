import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { SelectField } from "@/components/shared/form-fields";
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
import type { MembresiaSocio } from "@/api/membresias.api";
import type { TipoMembresia } from "@/api/tipos-membresia.api";
import { formatearMonto, METODO_PAGO_LABEL } from "@/features/pagos/formato";
import { getErrorMessage } from "@/lib/api-error";
import { useRenovarMembresia, useTiposMembresia } from "../hooks/useInscripcion";
import { METODOS_PAGO, renovacionSchema, type RenovacionFormValues } from "../schemas";

const OPCIONES_METODO = METODOS_PAGO.map((metodo) => ({
  value: metodo,
  label: METODO_PAGO_LABEL[metodo],
}));

const duracion = (dias: number) => (dias === 1 ? "1 día" : `${dias} días`);

// La fecha de fin se guarda en UTC: se muestra en UTC, igual que en la lista de membresías
const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC" });

function Encabezado({ membresia }: { membresia: MembresiaSocio }) {
  return (
    <DialogHeader>
      <DialogTitle>Renovar membresía</DialogTitle>
      <DialogDescription>
        {membresia.actividad.nombre} · {membresia.tipoMembresia.nombre}, vence el{" "}
        {formatearFecha(membresia.fechaFin)}
      </DialogDescription>
    </DialogHeader>
  );
}

function SoloCerrar({ membresia, children }: { membresia: MembresiaSocio; children: ReactNode }) {
  return (
    <>
      <Encabezado membresia={membresia} />
      <div className="my-4">{children}</div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cerrar</DialogClose>
      </DialogFooter>
    </>
  );
}

function FormularioRenovacion({
  membresia,
  tipos,
  onDone,
}: {
  membresia: MembresiaSocio;
  // Tipos activos de la actividad de la membresía
  tipos: TipoMembresia[];
  onDone: () => void;
}) {
  const renovar = useRenovarMembresia();
  const form = useForm<RenovacionFormValues>({
    resolver: zodResolver(renovacionSchema),
    defaultValues: {
      // Por defecto, el mismo plan; si se dio de baja, hay que elegir otro
      tipoMembresiaId: tipos.some((tipo) => tipo.id === membresia.tipoMembresia.id)
        ? membresia.tipoMembresia.id
        : "",
      metodoPago: "EFECTIVO",
    },
  });
  const tipoMembresiaId = useWatch({ control: form.control, name: "tipoMembresiaId" });
  const tipoElegido = tipos.find((tipo) => tipo.id === tipoMembresiaId);

  function enviar(valores: RenovacionFormValues) {
    renovar.mutate(
      { id: membresia.id, input: valores },
      {
        onSuccess: (nueva) => {
          toast.add({
            type: "success",
            title: "Membresía renovada",
            description: `${membresia.actividad.nombre} hasta el ${formatearFecha(nueva.fechaFin)}`,
          });
          onDone();
        },
      }
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <Encabezado membresia={membresia} />

      <div className="my-4">
        <p className="mb-4 text-sm">
          {membresia.estadoVigencia === "VENCIDA"
            ? "La membresía ya venció: la renovación empieza hoy."
            : `La renovación empieza el ${formatearFecha(membresia.fechaFin)}, cuando vence la actual.`}
        </p>
        <FieldGroup>
          <SelectField
            control={form.control}
            name="tipoMembresiaId"
            label="Tipo de membresía"
            options={[
              { value: "", label: "Elegí el tipo" },
              ...tipos.map((tipo) => ({
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
        </FieldGroup>
        {renovar.error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {getErrorMessage(renovar.error)}
          </p>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={renovar.isPending}>
          {renovar.isPending ? "Renovando…" : "Renovar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RenovarMembresia({
  membresia,
  onDone,
}: {
  membresia: MembresiaSocio;
  onDone: () => void;
}) {
  const tipos = useTiposMembresia();

  if (tipos.isPending) {
    return (
      <SoloCerrar membresia={membresia}>
        <p role="status" className="text-sm text-muted-foreground">
          Cargando tipos de membresía…
        </p>
      </SoloCerrar>
    );
  }
  if (tipos.error) {
    return (
      <SoloCerrar membresia={membresia}>
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(tipos.error)}
        </p>
      </SoloCerrar>
    );
  }

  // Solo los tipos activos de la misma actividad: la renovación no cambia de actividad
  const tiposDeLaActividad = tipos.data.filter(
    (tipo) => tipo.activo && tipo.actividadId === membresia.actividad.id
  );
  if (tiposDeLaActividad.length === 0) {
    return (
      <SoloCerrar membresia={membresia}>
        <p className="text-sm text-muted-foreground">
          {membresia.actividad.nombre} no tiene tipos de membresía activos. Un administrador tiene
          que cargar uno antes de renovar.
        </p>
      </SoloCerrar>
    );
  }

  return <FormularioRenovacion membresia={membresia} tipos={tiposDeLaActividad} onDone={onDone} />;
}

export function RenovarMembresiaDialog({
  membresia,
  onCerrar,
}: {
  membresia: MembresiaSocio | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={membresia !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {membresia && <RenovarMembresia membresia={membresia} onDone={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}
