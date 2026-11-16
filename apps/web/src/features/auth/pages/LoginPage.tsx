import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { useAuthConfig } from "../hooks/useAuthConfig";
import { useLogin } from "../hooks/useLogin";
import { loginSchema, type LoginInput } from "../schemas";

export function LoginPage() {
  const ultimoSlug = useAuthStore((state) => state.ultimoSlug);
  const login = useLogin();
  const config = useAuthConfig();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { gimnasioSlug: ultimoSlug, email: "", password: "" },
  });

  return (
    <div className="flex w-full max-w-sm flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="titulo-pantalla">Ingresá a FitManager</h1>
        <p className="text-sm text-muted-foreground">Usá tu cuenta del gimnasio para continuar.</p>
      </div>

      {/* noValidate: la validación la hace Zod, no el navegador */}
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
      >
        <FieldGroup>
          <Controller
            name="gimnasioSlug"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-gimnasio">Gimnasio</FieldLabel>
                <Input
                  {...field}
                  id="login-gimnasio"
                  aria-invalid={fieldState.invalid}
                  autoComplete="organization"
                />
                <FieldDescription>
                  El identificador de tu gimnasio, por ejemplo fitzone-bahia-blanca.
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="login-email"
                  type="email"
                  aria-invalid={fieldState.invalid}
                  autoComplete="username"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                <Input
                  {...field}
                  id="login-password"
                  type="password"
                  aria-invalid={fieldState.invalid}
                  autoComplete="current-password"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        {/* Error que devuelve la API (por ejemplo, credenciales inválidas) */}
        {login.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(login.error)}
          </p>
        )}

        <Button type="submit" disabled={login.isPending} size="xl" className="w-full">
          {login.isPending ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      {/* Solo si la API confirma que el registro está abierto (FIT-47) */}
      {config.data?.registroGimnasiosHabilitado && (
        <p className="text-center text-sm text-muted-foreground">
          ¿Tu gimnasio todavía no usa FitManager?{" "}
          <Link to="/registro" className="font-semibold text-primary hover:underline">
            Registrá tu gimnasio
          </Link>
        </p>
      )}
    </div>
  );
}
