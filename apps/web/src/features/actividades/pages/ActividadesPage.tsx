import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { CrearActividadDialog, EditarActividadDialog } from "../components/ActividadDialogs";
import { ActividadesTable } from "../components/ActividadesTable";
import { useActividades, useActualizarActividad } from "../hooks/useActividades";
import type { Actividad } from "../types";

export function ActividadesPage() {
  const { data: actividades, isPending, error, refetch, isFetching } = useActividades();
  const puedeEditar = useAuthStore((state) => state.usuario?.rol === "ADMIN");
  const cambioDeEstado = useActualizarActividad();

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Actividad | null>(null);

  function cambiarEstado(actividad: Actividad) {
    const activar = !actividad.activa;
    cambioDeEstado.mutate(
      { id: actividad.id, cambios: { activa: activar } },
      {
        onSuccess: () =>
          toast.add({
            type: "success",
            title: activar ? "Actividad activada" : "Actividad desactivada",
            description: actividad.nombre,
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
          <h1 className="text-xl font-semibold">Actividades</h1>
          <p className="text-sm text-muted-foreground">Lo que ofrece el gimnasio.</p>
        </div>
        {puedeEditar && <Button onClick={() => setCreando(true)}>Nueva actividad</Button>}
      </div>

      <Card>
        <CardContent className="px-2">
          {isPending && (
            <p role="status" className="p-4 text-sm text-muted-foreground">
              Cargando actividades…
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

          {actividades && (
            <ActividadesTable
              actividades={actividades}
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
          <CrearActividadDialog abierto={creando} onAbiertoChange={setCreando} />
          <EditarActividadDialog actividad={editando} onCerrar={() => setEditando(null)} />
        </>
      )}
    </div>
  );
}
