import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
            title: activar ? "Profesor activado" : "Profesor desactivado",
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Profesores</h1>
          <p className="text-sm text-muted-foreground">Quienes dan clases en el gimnasio.</p>
        </div>
        {puedeEditar && <Button onClick={() => setCreando(true)}>Nuevo profesor</Button>}
      </div>

      <Card>
        <CardContent className="px-2">
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

          {profesores && (
            <ProfesoresTable
              profesores={profesores}
              puedeEditar={puedeEditar}
              idCambiandoEstado={
                cambioDeEstado.isPending ? (cambioDeEstado.variables?.id ?? null) : null
              }
              onEditar={setEditando}
              onCambiarEstado={cambiarEstado}
            />
          )}
        </CardContent>
      </Card>

      {puedeEditar && (
        <>
          <CrearProfesorDialog abierto={creando} onAbiertoChange={setCreando} />
          <EditarProfesorDialog profesor={editando} onCerrar={() => setEditando(null)} />
        </>
      )}
    </div>
  );
}
