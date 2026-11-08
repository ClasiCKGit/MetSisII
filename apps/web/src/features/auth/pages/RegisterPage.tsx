import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { TextField } from "@/components/shared/form-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { getErrorMessage, hasStatus } from "@/lib/api-error";
import { slugify } from "@/lib/slugify";
import { useRegister } from "../hooks/useRegister";
import { registerSchema, type RegisterInput } from "../schemas";

export function RegisterPage() {
  const registro = useRegister();
  // Mientras el usuario no escriba el identificador a mano, se completa solo a partir del nombre
  const [slugEditadoAMano, setSlugEditadoAMano] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      gimnasioNombre: "",
      gimnasioSlug: "",
      adminNombre: "",
      adminApellido: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function sugerirSlug(nombre: string) {
    if (!slugEditadoAMano) {
      form.setValue("gimnasioSlug", slugify(nombre), {
        shouldValidate: form.formState.isSubmitted,
      });
    }
  }

  function enviar(valores: RegisterInput) {
    registro.mutate(valores, {
      onError: (error) => {
        // 409: otro gimnasio ya usa ese identificador. El error se muestra en el campo, no arriba.
        if (hasStatus(error, 409)) {
          form.setError("gimnasioSlug", { message: "Ese identificador ya está en uso" });
        }
      },
    });
  }

  const errorGeneral = registro.error && !hasStatus(registro.error, 409);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Registrá tu gimnasio</CardTitle>
        <CardDescription>Creá la cuenta del gimnasio y de su primer administrador.</CardDescription>
      </CardHeader>

      <CardContent>
        <form id="form-registro" noValidate onSubmit={form.handleSubmit(enviar)}>
          <FieldGroup>
            <TextField
              control={form.control}
              name="gimnasioNombre"
              label="Nombre del gimnasio"
              autoComplete="organization"
              onValueChange={sugerirSlug}
            />
            <TextField
              control={form.control}
              name="gimnasioSlug"
              label="Identificador"
              description="Es lo que van a escribir al iniciar sesión. Solo minúsculas, números y guiones."
              autoComplete="off"
              onValueChange={() => setSlugEditadoAMano(true)}
            />
            <TextField
              control={form.control}
              name="adminNombre"
              label="Tu nombre"
              autoComplete="given-name"
            />
            <TextField
              control={form.control}
              name="adminApellido"
              label="Tu apellido"
              autoComplete="family-name"
            />
            <TextField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="username"
            />
            <TextField
              control={form.control}
              name="password"
              label="Contraseña"
              type="password"
              description="Entre 8 y 72 caracteres."
              autoComplete="new-password"
            />
            <TextField
              control={form.control}
              name="confirmPassword"
              label="Repetir contraseña"
              type="password"
              autoComplete="new-password"
            />
          </FieldGroup>

          {errorGeneral && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {getErrorMessage(registro.error)}
            </p>
          )}
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <Button type="submit" form="form-registro" disabled={registro.isPending} className="w-full">
          {registro.isPending ? "Creando…" : "Crear gimnasio"}
        </Button>
        <Link to="/login" className={buttonVariants({ variant: "link" })}>
          Ya tengo una cuenta
        </Link>
      </CardFooter>
    </Card>
  );
}
