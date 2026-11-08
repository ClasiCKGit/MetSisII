import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { getErrorMessage } from "@/lib/api-error";
import { useChangePassword } from "../hooks/useChangePassword";
import { changePasswordSchema, type ChangePasswordInput } from "../schemas";

// El formulario es un componente aparte A PROPÓSITO: el contenido del diálogo se desmonta al
// cerrarlo, así que cada vez que se abre se crea un formulario nuevo y vacío, sin tener que resetearlo.
function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const cambio = useChangePassword();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((valores) => cambio.mutate(valores, { onSuccess: onDone }))}
    >
      <DialogHeader>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogDescription>
          Necesitamos tu contraseña actual para confirmar que sos vos.
        </DialogDescription>
      </DialogHeader>

      <div className="my-4">
        <FieldGroup>
          <TextField
            control={form.control}
            name="currentPassword"
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
          />
          <TextField
            control={form.control}
            name="newPassword"
            label="Contraseña nueva"
            type="password"
            autoComplete="new-password"
          />
          <TextField
            control={form.control}
            name="confirmNewPassword"
            label="Repetir contraseña nueva"
            type="password"
            autoComplete="new-password"
          />
        </FieldGroup>

        {cambio.error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {getErrorMessage(cambio.error)}
          </p>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={cambio.isPending}>
          {cambio.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ChangePasswordDialog() {
  const [abierto, setAbierto] = useState(false);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      {/* render: el disparador se dibuja como un Button (en Radix esto era asChild) */}
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Cambiar contraseña
      </DialogTrigger>
      <DialogContent>
        <ChangePasswordForm onDone={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
