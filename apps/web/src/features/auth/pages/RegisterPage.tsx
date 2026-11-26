import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { TextField } from "@/components/shared/form-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { getErrorMessage, hasStatus } from "@/lib/api-error";
import { slugify } from "@/lib/slugify";
import { useAuthConfig } from "../hooks/useAuthConfig";
import { useRegister } from "../hooks/useRegister";
import { registerSchema, type RegisterInput } from "../schemas";

export function RegisterPage() {
  const config = useAuthConfig();
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

  if (config.isPending) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }
  // Si la consulta falla (API caída) se muestra el formulario igual: la API decide al enviar
  if (config.data?.registroGimnasiosHabilitado === false) {
    return <RegistroCerrado />;
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="titulo-pantalla">Registrá tu gimnasio</h1>
        <p className="text-sm text-muted-foreground">
          Creá la cuenta del gimnasio y de su primer administrador.
        </p>
      </div>

      <form noValidate className="flex flex-col gap-8" onSubmit={form.handleSubmit(enviar)}>
        <FieldSet>
          <FieldLegend className="font-heading text-xs! font-extrabold tracking-widest text-primary uppercase">
            01 · Tu gimnasio
          </FieldLegend>
          <div className="grid gap-5 sm:grid-cols-2">
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
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend className="font-heading text-xs! font-extrabold tracking-widest text-primary uppercase">
            02 · Cuenta de administrador
          </FieldLegend>
          <div className="grid gap-5 sm:grid-cols-2">
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
            <div className="sm:col-span-2">
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                autoComplete="username"
              />
            </div>
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
          </div>
        </FieldSet>

        {errorGeneral && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(registro.error)}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <Button type="submit" disabled={registro.isPending} size="xl" className="w-full">
            {registro.isPending ? "Creando…" : "Crear gimnasio"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Ya tengo una cuenta
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

function RegistroCerrado() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <h1 className="titulo-pantalla">Registro no disponible</h1>
      <p className="text-sm text-muted-foreground">
        Por ahora no se pueden registrar gimnasios nuevos. Si tu gimnasio ya usa FitManager, pedile
        una cuenta a su administrador.
      </p>
      <Link to="/login" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        Ir a iniciar sesión
      </Link>
    </div>
  );
}
