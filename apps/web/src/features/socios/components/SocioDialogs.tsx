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
import { getErrorMessage, hasStatus } from "@/lib/api-error";
import { useActualizarSocio, useCrearSocio } from "../hooks/useSocios";
import { aSocioInput, socioSchema, type SocioFormValues } from "../schemas";
import type { Socio } from "../types";

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

// Los campos son los mismos para crear y para editar
function CamposSocio({ control }: { control: Control<SocioFormValues> }) {
  return (
    <FieldGroup>
      <TextField control={control} name="nombre" label="Nombre" autoComplete="off" />
      <TextField control={control} name="apellido" label="Apellido" autoComplete="off" />
      <TextField
        control={control}
        name="dni"
        label="DNI"
        inputMode="numeric"
        description="7 u 8 dígitos, sin puntos."
        autoComplete="off"
      />
      <TextField
        control={control}
        name="email"
        label="Email (opcional)"
        type="email"
        autoComplete="off"
      />
      <TextField
        control={control}
        name="telefono"
        label="Teléfono (opcional)"
        type="tel"
        autoComplete="off"
      />
      <TextField
        control={control}
        name="fechaNacimiento"
        label="Fecha de nacimiento (opcional)"
        type="date"
      />
    </FieldGroup>
  );
}

// ───────────────────────── Crear ─────────────────────────

const VALORES_VACIOS: SocioFormValues = {
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  telefono: "",
  fechaNacimiento: "",
};

function CrearSocioForm({ onDone }: { onDone: () => void }) {
  const crear = useCrearSocio();
  const form = useForm<SocioFormValues>({
    resolver: zodResolver(socioSchema),
    defaultValues: VALORES_VACIOS,
  });

  function enviar(valores: SocioFormValues) {
    crear.mutate(aSocioInput(valores), {
      onSuccess: (socio) => {
        toast.add({
          type: "success",
          title: "Socio creado",
          description: `${socio.nombre} ${socio.apellido}`,
        });
        onDone();
      },
      onError: (error) => {
        // 409: ya hay un socio con ese DNI en este gimnasio. Se muestra en el campo.
        if (hasStatus(error, 409)) form.setError("dni", { message: error.message });
      },
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Nuevo socio</DialogTitle>
        <DialogDescription>Los datos de una persona que entrena en el gimnasio.</DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <CamposSocio control={form.control} />
        {crear.error && !hasStatus(crear.error, 409) && <ErrorDelServidor error={crear.error} />}
      </div>

      <PieDelFormulario enviando={crear.isPending} textoEnviar="Crear socio" />
    </form>
  );
}

export function CrearSocioDialog({
  abierto,
  onAbiertoChange,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent>
        <CrearSocioForm onDone={() => onAbiertoChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Editar ─────────────────────────

function valoresDe(socio: Socio): SocioFormValues {
  return {
    nombre: socio.nombre,
    apellido: socio.apellido,
    dni: socio.dni,
    email: socio.email ?? "",
    telefono: socio.telefono ?? "",
    fechaNacimiento: socio.fechaNacimiento?.slice(0, 10) ?? "",
  };
}

function EditarSocioForm({ socio, onDone }: { socio: Socio; onDone: () => void }) {
  const actualizar = useActualizarSocio();
  const form = useForm<SocioFormValues>({
    resolver: zodResolver(socioSchema),
    defaultValues: valoresDe(socio),
  });

  function enviar(valores: SocioFormValues) {
    actualizar.mutate(
      { id: socio.id, cambios: aSocioInput(valores) },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: "Socio actualizado" });
          onDone();
        },
        onError: (error) => {
          if (hasStatus(error, 409)) form.setError("dni", { message: error.message });
        },
      }
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Editar socio</DialogTitle>
        <DialogDescription>
          {socio.nombre} {socio.apellido}
        </DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <CamposSocio control={form.control} />
        {actualizar.error && !hasStatus(actualizar.error, 409) && (
          <ErrorDelServidor error={actualizar.error} />
        )}
      </div>

      <PieDelFormulario enviando={actualizar.isPending} textoEnviar="Guardar cambios" />
    </form>
  );
}

export function EditarSocioDialog({
  socio,
  onCerrar,
}: {
  socio: Socio | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={socio !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>{socio && <EditarSocioForm socio={socio} onDone={onCerrar} />}</DialogContent>
    </Dialog>
  );
}
