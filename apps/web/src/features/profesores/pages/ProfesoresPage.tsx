import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { EncabezadoPantalla } from "@/components/shared/EncabezadoPantalla";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { CrearProfesorDialog, EditarProfesorDialog } from "../components/ProfesorDialogs";
import { ProfesoresTable } from "../components/ProfesoresTable";
import { useActualizarProfesor, useProfesores } from "../hooks/useProfesores";
import type { Profesor } from "../types";

export function ProfesoresPage() {
  const { data: profesores, isPending, error, refetch, isFetching } = useProfesores();
  // Todos los usuarios con sesión pueden ver la lista; solo los administradores la modifican
  const puedeEditar = useAuthStore((state) => state.usuario?.rol === "ADMIN");
  const cambioDeEstado = useActualizarProfesor();
  const [filtroEstado, setFiltroEstado] = useState<"activos" | "inactivos" | "todos">("activos");
  const profesoresVisibles = profesores?.filter((profesor) =>
    filtroEstado === "todos"
      ? true
      : filtroEstado === "activos"
        ? profesor.activo
        : !profesor.activo
  );

  // Qué diálogo está abierto. El segundo guarda el profesor sobre el que se actúa.
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Profesor | null>(null);

  function cambiarEstado(profesor: Profesor) {
    const activar = !profesor.activo;
    cambioDeEstado.mutate(
      { id: profesor.id, cambios: { activo: activar } },
      {
        onSuccess: () =>
          toast.add({
            type: "success",
            title: activar ? "Profesor reactivado" : "Profesor dado de baja",
            description: `${profesor.nombre} ${profesor.apellido}`,
          }),
        onError: (error) =>
          toast.add({
            type: "error",
            title: "No se pudo cambiar el estado",
            description: getErrorMessage(error),
          }),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPantalla
        titulo="Profesores"
        descripcion="Quienes dan clases en el gimnasio."
        accion={
          puedeEditar && (
            <Button size="lg" onClick={() => setCreando(true)}>
              <PlusIcon aria-hidden="true" />
              Nuevo profesor
            </Button>
          )
        }
      />

      <div className="flex justify-end">
        <NativeSelect
          aria-label="Filtrar profesores por estado"
          className="w-full sm:w-48"
          value={filtroEstado}
          onChange={(event) => setFiltroEstado(event.target.value as typeof filtroEstado)}
        >
          <NativeSelectOption value="activos">Activos</NativeSelectOption>
          <NativeSelectOption value="inactivos">Dados de baja</NativeSelectOption>
          <NativeSelectOption value="todos">Todos</NativeSelectOption>
        </NativeSelect>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isPending && (
          <p role="status" className="p-4 text-sm text-muted-foreground">
            Cargando profesores…
          </p>
        )}

        {error && (
          <div role="alert" className="flex flex-col items-start gap-3 p-4">
            <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Reintentar
            </Button>
          </div>
        )}

        {profesoresVisibles && (
          <ProfesoresTable
            profesores={profesoresVisibles}
            puedeEditar={puedeEditar}
            mensajeVacio={
              filtroEstado === "activos"
                ? "No hay profesores activos."
                : filtroEstado === "inactivos"
                  ? "No hay profesores dados de baja."
                  : "Todavía no hay profesores cargados."
            }
            idCambiandoEstado={
              cambioDeEstado.isPending ? (cambioDeEstado.variables?.id ?? null) : null
            }
            onEditar={setEditando}
            onCambiarEstado={cambiarEstado}
          />
        )}
      </div>

      {puedeEditar && (
        <>
          <CrearProfesorDialog abierto={creando} onAbiertoChange={setCreando} />
          <EditarProfesorDialog profesor={editando} onCerrar={() => setEditando(null)} />
        </>
      )}
    </div>
  );
}
