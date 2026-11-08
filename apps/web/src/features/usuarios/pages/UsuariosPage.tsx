import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import {
  CrearUsuarioDialog,
  EditarUsuarioDialog,
  ResetPasswordDialog,
} from "../components/UsuarioDialogs";
import { UsuariosTable } from "../components/UsuariosTable";
import { useActualizarUsuario, useUsuarios } from "../hooks/useUsuarios";
import type { UsuarioListado } from "../types";

export function UsuariosPage() {
  const { data: usuarios, isPending, error, refetch, isFetching } = useUsuarios();
  const yoId = useAuthStore((state) => state.usuario?.id);
  const cambioDeEstado = useActualizarUsuario();

  // Qué diálogo está abierto. Los dos últimos guardan el usuario sobre el que se actúa.
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<UsuarioListado | null>(null);
  const [reseteando, setReseteando] = useState<UsuarioListado | null>(null);

  function cambiarEstado(usuario: UsuarioListado) {
    const activar = !usuario.activo;
    cambioDeEstado.mutate(
      { id: usuario.id, cambios: { activo: activar } },
      {
        onSuccess: () =>
          toast.add({
            type: "success",
            title: activar ? "Usuario activado" : "Usuario desactivado",
            description: `${usuario.nombre} ${usuario.apellido}`,
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
          <h1 className="text-xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Personal con acceso al sistema.</p>
        </div>
        <Button onClick={() => setCreando(true)}>Nuevo usuario</Button>
      </div>

      <Card>
        <CardContent className="px-2">
          {isPending && (
            <p role="status" className="p-4 text-sm text-muted-foreground">
              Cargando usuarios…
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

          {usuarios && (
            <UsuariosTable
              usuarios={usuarios}
              yoId={yoId}
              idCambiandoEstado={
                cambioDeEstado.isPending ? (cambioDeEstado.variables?.id ?? null) : null
              }
              onEditar={setEditando}
              onResetear={setReseteando}
              onCambiarEstado={cambiarEstado}
            />
          )}
        </CardContent>
      </Card>

      <CrearUsuarioDialog abierto={creando} onAbiertoChange={setCreando} />
      <EditarUsuarioDialog
        usuario={editando}
        esUnoMismo={editando?.id === yoId}
        onCerrar={() => setEditando(null)}
      />
      <ResetPasswordDialog usuario={reseteando} onCerrar={() => setReseteando(null)} />
    </div>
  );
}
