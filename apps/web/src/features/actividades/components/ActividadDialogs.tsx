import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Control } from "react-hook-form";
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
import { getErrorMessage } from "@/lib/api-error";
import { useActualizarActividad, useCrearActividad } from "../hooks/useActividades";
import { actividadSchema, aPayload, type ActividadInput } from "../schemas";
import type { Actividad } from "../types";

function PieDelFormulario({ enviando, textoEnviar }: { enviando: boolean; textoEnviar: string }) {
  return (
    <DialogFooter>
      <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
      <Button type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : textoEnviar}
      </Button>
    </DialogFooter>
  );
}

function ErrorDelServidor({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-4 text-sm text-destructive">
      {getErrorMessage(error)}
    </p>
  );
}

function CamposDeLaActividad({ control }: { control: Control<ActividadInput> }) {
  return (
    <FieldGroup>
      <TextField control={control} name="nombre" label="Nombre" autoComplete="off" />
      <TextField
        control={control}
        name="descripcion"
        label="Descripción"
        description="Opcional."
        autoComplete="off"
      />
      <TextField
        control={control}
        name="cupo"
        label="Cupo"
        description="Cantidad máxima de personas. Dejalo vacío si no hay límite."
        inputMode="numeric"
        autoComplete="off"
      />
    </FieldGroup>
  );
}

const VALORES_VACIOS: ActividadInput = { nombre: "", descripcion: "", cupo: "" };

function CrearActividadForm({ onDone }: { onDone: () => void }) {
  const crear = useCrearActividad();
  const form = useForm<ActividadInput>({
    resolver: zodResolver(actividadSchema),
    defaultValues: VALORES_VACIOS,
  });

  function enviar(valores: ActividadInput) {
    crear.mutate(aPayload(valores), {
      onSuccess: (actividad) => {
        toast.add({ type: "success", title: "Actividad creada", description: actividad.nombre });
        onDone();
      },
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Nueva actividad</DialogTitle>
        <DialogDescription>
          Algo que ofrece el gimnasio, como musculación o crossfit.
        </DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <CamposDeLaActividad control={form.control} />
        <ErrorDelServidor error={crear.error} />
      </div>

      <PieDelFormulario enviando={crear.isPending} textoEnviar="Crear actividad" />
    </form>
  );
}

export function CrearActividadDialog({
  abierto,
  onAbiertoChange,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent>
        <CrearActividadForm onDone={() => onAbiertoChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditarActividadForm({ actividad, onDone }: { actividad: Actividad; onDone: () => void }) {
  const actualizar = useActualizarActividad();
  const form = useForm<ActividadInput>({
    resolver: zodResolver(actividadSchema),
    defaultValues: {
      nombre: actividad.nombre,
      descripcion: actividad.descripcion ?? "",
      cupo: actividad.cupo === null ? "" : String(actividad.cupo),
    },
  });

  function enviar(valores: ActividadInput) {
    actualizar.mutate(
      { id: actividad.id, cambios: aPayload(valores) },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: "Actividad actualizada" });
          onDone();
        },
      }
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Editar actividad</DialogTitle>
        <DialogDescription>Dejá un dato opcional vacío para borrarlo.</DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <CamposDeLaActividad control={form.control} />
        <ErrorDelServidor error={actualizar.error} />
      </div>

      <PieDelFormulario enviando={actualizar.isPending} textoEnviar="Guardar cambios" />
    </form>
  );
}

export function EditarActividadDialog({
  actividad,
  onCerrar,
}: {
  actividad: Actividad | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={actividad !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {actividad && <EditarActividadForm actividad={actividad} onDone={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}
