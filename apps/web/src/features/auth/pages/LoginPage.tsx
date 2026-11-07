import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { useLogin } from "../hooks/useLogin";
import { loginSchema, type LoginInput } from "../schemas";

export function LoginPage() {
  const ultimoSlug = useAuthStore((state) => state.ultimoSlug);
  const login = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { gimnasioSlug: ultimoSlug, email: "", password: "" },
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Ingresá a FitManager</CardTitle>
        <CardDescription>Usá tu cuenta del gimnasio para continuar.</CardDescription>
      </CardHeader>

      <CardContent>
        {/* noValidate: la validación la hace Zod, no el navegador */}
        <form
          id="form-login"
          noValidate
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
            <p role="alert" className="mt-4 text-sm text-destructive">
              {getErrorMessage(login.error)}
            </p>
          )}
        </form>
      </CardContent>

      <CardFooter>
        {/* El botón está fuera del <form>, por eso se asocia con el atributo form */}
        <Button type="submit" form="form-login" disabled={login.isPending} className="w-full">
          {login.isPending ? "Ingresando…" : "Ingresar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
