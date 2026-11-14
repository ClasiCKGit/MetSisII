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
import { useActualizarProfesor, useCrearProfesor } from "../hooks/useProfesores";
import { aPayload, profesorSchema, type ProfesorInput } from "../schemas";
import type { Profesor } from "../types";

// Pie común a los dos diálogos: Cancelar + el botón que envía el formulario
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

// Los campos son los mismos al crear y al editar
function CamposDelProfesor({ control }: { control: Control<ProfesorInput> }) {
  return (
    <FieldGroup>
      <TextField control={control} name="nombre" label="Nombre" autoComplete="off" />
      <TextField control={control} name="apellido" label="Apellido" autoComplete="off" />
      <TextField
        control={control}
        name="especialidad"
        label="Especialidad"
        description="Opcional."
        autoComplete="off"
      />
      <TextField
        control={control}
        name="dni"
        label="DNI"
        description="Opcional."
        autoComplete="off"
      />
      <TextField
        control={control}
        name="email"
        label="Email"
        type="email"
        description="Opcional."
        autoComplete="off"
      />
      <TextField
        control={control}
        name="telefono"
        label="Teléfono"
        type="tel"
        description="Opcional."
        autoComplete="off"
      />
    </FieldGroup>
  );
}

// ───────────────────────── Crear ─────────────────────────

const VALORES_VACIOS: ProfesorInput = {
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  telefono: "",
  especialidad: "",
};

function CrearProfesorForm({ onDone }: { onDone: () => void }) {
  const crear = useCrearProfesor();
  const form = useForm<ProfesorInput>({
    resolver: zodResolver(profesorSchema),
    defaultValues: VALORES_VACIOS,
  });

  function enviar(valores: ProfesorInput) {
    crear.mutate(aPayload(valores), {
      onSuccess: (profesor) => {
        toast.add({
          type: "success",
          title: "Profesor creado",
          description: `${profesor.nombre} ${profesor.apellido}`,
        });
        onDone();
      },
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Nuevo profesor</DialogTitle>
        <DialogDescription>Una persona que da clases en el gimnasio.</DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <CamposDelProfesor control={form.control} />
        <ErrorDelServidor error={crear.error} />
      </div>

      <PieDelFormulario enviando={crear.isPending} textoEnviar="Crear profesor" />
    </form>
  );
}

export function CrearProfesorDialog({
  abierto,
  onAbiertoChange,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent>
        <CrearProfesorForm onDone={() => onAbiertoChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Editar ─────────────────────────

function EditarProfesorForm({ profesor, onDone }: { profesor: Profesor; onDone: () => void }) {
  const actualizar = useActualizarProfesor();
  const form = useForm<ProfesorInput>({
    resolver: zodResolver(profesorSchema),
    // La API devuelve null en los datos vacíos; el formulario trabaja con texto
    defaultValues: {
      nombre: profesor.nombre,
      apellido: profesor.apellido,
      dni: profesor.dni ?? "",
      email: profesor.email ?? "",
      telefono: profesor.telefono ?? "",
      especialidad: profesor.especialidad ?? "",
    },
  });

  function enviar(valores: ProfesorInput) {
    actualizar.mutate(
      { id: profesor.id, cambios: aPayload(valores) },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: "Profesor actualizado" });
          onDone();
        },
      }
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Editar profesor</DialogTitle>
        <DialogDescription>Dejá un dato opcional vacío para borrarlo.</DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <CamposDelProfesor control={form.control} />
        <ErrorDelServidor error={actualizar.error} />
      </div>

      <PieDelFormulario enviando={actualizar.isPending} textoEnviar="Guardar cambios" />
    </form>
  );
}

export function EditarProfesorDialog({
  profesor,
  onCerrar,
}: {
  profesor: Profesor | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={profesor !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {profesor && <EditarProfesorForm profesor={profesor} onDone={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}
