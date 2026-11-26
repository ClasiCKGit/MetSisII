import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TextField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api-error";
import { useResetPassword } from "../hooks/useResetPassword";
import { resetPasswordSchema, type ResetPasswordInput } from "../schemas";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const resetPassword = useResetPassword();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });

  if (!token) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="titulo-pantalla">Link inválido</h1>
        <p className="text-sm text-muted-foreground">
          Este link no es válido. Pedí uno nuevo desde la pantalla de inicio de sesión.
        </p>
        <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-7">
      <h1 className="titulo-pantalla">Elegí tu nueva contraseña</h1>

      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={form.handleSubmit(({ newPassword }) =>
          resetPassword.mutate(
            { token, newPassword },
            {
              onSuccess: () => {
                toast.add({ type: "success", title: "Contraseña actualizada" });
                navigate("/login", { replace: true });
              },
            }
          )
        )}
      >
        <FieldGroup>
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

        {resetPassword.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(resetPassword.error)}
          </p>
        )}

        <Button type="submit" disabled={resetPassword.isPending} size="xl" className="w-full">
          {resetPassword.isPending ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </div>
  );
}
