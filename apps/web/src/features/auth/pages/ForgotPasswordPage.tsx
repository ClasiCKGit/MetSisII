import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { useForgotPassword } from "../hooks/useForgotPassword";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas";

export function ForgotPasswordPage() {
  const ultimoSlug = useAuthStore((state) => state.ultimoSlug);
  const forgotPassword = useForgotPassword();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { gimnasioSlug: ultimoSlug, email: "" },
  });

  if (forgotPassword.isSuccess) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="titulo-pantalla">Revisá tu email</h1>
        <p className="text-sm text-muted-foreground">
          Si el email existe, te llegaron instrucciones para restablecer tu contraseña.
        </p>
        <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="titulo-pantalla">¿Olvidaste tu contraseña?</h1>
        <p className="text-sm text-muted-foreground">
          Ingresá tu gimnasio y tu email: te mandamos instrucciones para restablecerla.
        </p>
      </div>

      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={form.handleSubmit((values) => forgotPassword.mutate(values))}
      >
        <FieldGroup>
          <TextField
            control={form.control}
            name="gimnasioSlug"
            label="Gimnasio"
            autoComplete="organization"
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="username"
          />
        </FieldGroup>

        {forgotPassword.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(forgotPassword.error)}
          </p>
        )}

        <Button type="submit" disabled={forgotPassword.isPending} size="xl" className="w-full">
          {forgotPassword.isPending ? "Enviando…" : "Enviar instrucciones"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
