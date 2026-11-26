import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/shared/form-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api-error";
import { useActualizarGimnasio, useGimnasio } from "../hooks/useGimnasio";
import { aPayloadDeGimnasio, gimnasioSchema, type GimnasioInput } from "../schemas";
import type { DatosGimnasio } from "../types";

function FormularioGimnasio({ gimnasio }: { gimnasio: DatosGimnasio }) {
  const actualizar = useActualizarGimnasio();
  const form = useForm<GimnasioInput>({
    resolver: zodResolver(gimnasioSchema),
    defaultValues: {
      nombre: gimnasio.nombre,
      email: gimnasio.email ?? "",
      telefono: gimnasio.telefono ?? "",
      direccion: gimnasio.direccion ?? "",
    },
  });

  function enviar(valores: GimnasioInput) {
    actualizar.mutate(aPayloadDeGimnasio(valores), {
      onSuccess: (guardado) => {
        toast.add({ type: "success", title: "Datos del gimnasio actualizados" });
        // Lo guardado pasa a ser el punto de partida (normalizado por la API)
        form.reset({
          nombre: guardado.nombre,
          email: guardado.email ?? "",
          telefono: guardado.telefono ?? "",
          direccion: guardado.direccion ?? "",
        });
      },
    });
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(enviar)}
      className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-xl border bg-card p-5"
    >
      <div className="flex flex-col gap-1">
        <span className="rotulo">Identificador para iniciar sesión</span>
        <span className="font-mono font-semibold">{gimnasio.slug}</span>
        <span className="text-sm text-muted-foreground">
          No se puede cambiar: es lo que todo el personal escribe al iniciar sesión.
        </span>
      </div>

      <FieldGroup>
        <TextField
          control={form.control}
          name="nombre"
          label="Nombre"
          autoComplete="organization"
        />
        <TextField
          control={form.control}
          name="email"
          label="Email de contacto"
          description="Opcional."
          type="email"
          autoComplete="email"
        />
        <TextField
          control={form.control}
          name="telefono"
          label="Teléfono"
          description="Opcional."
          type="tel"
          autoComplete="tel"
        />
        <TextField
          control={form.control}
          name="direccion"
          label="Dirección"
          description="Opcional."
          autoComplete="street-address"
        />
      </FieldGroup>

      {actualizar.error && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(actualizar.error)}
        </p>
      )}

      <div>
        <Button type="submit" disabled={actualizar.isPending}>
          {actualizar.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

export function GimnasioPage() {
  const { data: gimnasio, isPending, error, refetch, isFetching } = useGimnasio();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="titulo-pantalla">Datos del gimnasio</h1>
        <p className="text-sm text-muted-foreground">
          El nombre se muestra en el menú y en los mails que reciben los socios.
        </p>
      </div>

      {isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando datos del gimnasio…
        </p>
      ) : error ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            Reintentar
          </Button>
        </div>
      ) : (
        <FormularioGimnasio gimnasio={gimnasio} />
      )}
    </div>
  );
}
