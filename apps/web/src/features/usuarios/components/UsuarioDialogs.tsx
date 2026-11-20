import { zodResolver } from "@hookform/resolvers/zod";
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
import { getErrorMessage, hasStatus } from "@/lib/api-error";
import { useActualizarUsuario, useCrearUsuario, useResetearPassword } from "../hooks/useUsuarios";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
  resetPasswordSchema,
  type CrearUsuarioInput,
  type EditarUsuarioInput,
  type ResetPasswordInput,
} from "../schemas";
import { ROL_LABEL, type UsuarioListado } from "../types";

const OPCIONES_ROL = (Object.keys(ROL_LABEL) as Array<keyof typeof ROL_LABEL>).map((rol) => ({
  value: rol,
  label: ROL_LABEL[rol],
}));

// Pie común a los tres diálogos: Cancelar + el botón que envía el formulario
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

// ───────────────────────── Crear ─────────────────────────

function CrearUsuarioForm({ onDone }: { onDone: () => void }) {
  const crear = useCrearUsuario();
  const form = useForm<CrearUsuarioInput>({
    resolver: zodResolver(crearUsuarioSchema),
    defaultValues: { nombre: "", apellido: "", email: "", password: "", rol: "RECEPCIONISTA" },
  });

  function enviar(valores: CrearUsuarioInput) {
    crear.mutate(valores, {
      onSuccess: (usuario) => {
        toast.add({
          type: "success",
          title: "Usuario creado",
          description: `${usuario.nombre} ${usuario.apellido}`,
        });
        onDone();
      },
      onError: (error) => {
        // 409: el email ya existe en este gimnasio. Se muestra en el campo.
        if (hasStatus(error, 409)) form.setError("email", { message: error.message });
      },
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Nuevo usuario</DialogTitle>
        <DialogDescription>Una persona del personal con acceso al sistema.</DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <FieldGroup>
          <TextField control={form.control} name="nombre" label="Nombre" autoComplete="off" />
          <TextField control={form.control} name="apellido" label="Apellido" autoComplete="off" />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="off"
          />
          <TextField
            control={form.control}
            name="password"
            label="Contraseña inicial"
            type="password"
            description="Entre 8 y 72 caracteres. La persona puede cambiarla después."
            autoComplete="new-password"
          />
          <SelectField
            control={form.control}
            name="rol"
            label="Rol"
            options={OPCIONES_ROL}
            description="Los administradores pueden gestionar usuarios; recepción no."
          />
        </FieldGroup>
        {crear.error && !hasStatus(crear.error, 409) && <ErrorDelServidor error={crear.error} />}
      </div>

      <PieDelFormulario enviando={crear.isPending} textoEnviar="Crear usuario" />
    </form>
  );
}

export function CrearUsuarioDialog({
  abierto,
  onAbiertoChange,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent>
        <CrearUsuarioForm onDone={() => onAbiertoChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Editar ─────────────────────────

function EditarUsuarioForm({
  usuario,
  esUnoMismo,
  onDone,
}: {
  usuario: UsuarioListado;
  esUnoMismo: boolean;
  onDone: () => void;
}) {
  const actualizar = useActualizarUsuario();
  const form = useForm<EditarUsuarioInput>({
    resolver: zodResolver(editarUsuarioSchema),
    defaultValues: { nombre: usuario.nombre, apellido: usuario.apellido, rol: usuario.rol },
  });

  function enviar(valores: EditarUsuarioInput) {
    actualizar.mutate(
      { id: usuario.id, cambios: valores },
      {
        onSuccess: () => {
          toast.add({ type: "success", title: "Usuario actualizado" });
          onDone();
        },
      }
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogDescription>{usuario.email}</DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <FieldGroup>
          <TextField control={form.control} name="nombre" label="Nombre" autoComplete="off" />
          <TextField control={form.control} name="apellido" label="Apellido" autoComplete="off" />
          <SelectField
            control={form.control}
            name="rol"
            label="Rol"
            options={OPCIONES_ROL}
            // La API no deja que un administrador se quite su propio rol
            disabled={esUnoMismo}
            description={esUnoMismo ? "No podés cambiar tu propio rol." : undefined}
          />
        </FieldGroup>
        <ErrorDelServidor error={actualizar.error} />
      </div>

      <PieDelFormulario enviando={actualizar.isPending} textoEnviar="Guardar cambios" />
    </form>
  );
}

export function EditarUsuarioDialog({
  usuario,
  esUnoMismo,
  onCerrar,
}: {
  usuario: UsuarioListado | null;
  esUnoMismo: boolean;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={usuario !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {usuario && (
          <EditarUsuarioForm usuario={usuario} esUnoMismo={esUnoMismo} onDone={onCerrar} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Resetear contraseña ─────────────────────────

function ResetPasswordForm({ usuario, onDone }: { usuario: UsuarioListado; onDone: () => void }) {
  const resetear = useResetearPassword();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  function enviar(valores: ResetPasswordInput) {
    resetear.mutate(
      { id: usuario.id, valores },
      {
        onSuccess: () => {
          toast.add({
            type: "success",
            title: "Contraseña restablecida",
            description: `${usuario.nombre} ${usuario.apellido} ya puede ingresar con la nueva contraseña.`,
          });
          onDone();
        },
      }
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(enviar)}>
      <DialogHeader>
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogDescription>
          {usuario.nombre} {usuario.apellido} · {usuario.email}
        </DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <FieldGroup>
          <TextField
            control={form.control}
            name="password"
            label="Contraseña nueva"
            type="password"
            description="Avisale a la persona cuál es. Sus sesiones abiertas siguen activas hasta que venzan."
            autoComplete="new-password"
          />
        </FieldGroup>
        <ErrorDelServidor error={resetear.error} />
      </div>

      <PieDelFormulario enviando={resetear.isPending} textoEnviar="Restablecer" />
    </form>
  );
}

export function ResetPasswordDialog({
  usuario,
  onCerrar,
}: {
  usuario: UsuarioListado | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={usuario !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        {usuario && <ResetPasswordForm usuario={usuario} onDone={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}
