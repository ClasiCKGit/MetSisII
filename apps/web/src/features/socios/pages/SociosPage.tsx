import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { CrearSocioDialog, EditarSocioDialog } from "../components/SocioDialogs";
import { SociosTable } from "../components/SociosTable";
import { useActualizarSocio, useSocios } from "../hooks/useSocios";
import type { FiltroEstado, Socio } from "../types";

// El filtro de la pantalla se traduce al parámetro `activo` de la API (undefined = todos)
const ACTIVO_POR_FILTRO: Record<FiltroEstado, boolean | undefined> = {
  todos: undefined,
  activos: true,
  inactivos: false,
};

// Devuelve el valor recién después de `retrasoMs` sin cambios: así se consulta a la API
// cuando la persona deja de escribir y no con cada letra.
function useValorConRetraso<T>(valor: T, retrasoMs: number): T {
  const [conRetraso, setConRetraso] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setConRetraso(valor), retrasoMs);
    return () => clearTimeout(temporizador);
  }, [valor, retrasoMs]);
  return conRetraso;
}

export function SociosPage() {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("activos");
  const q = useValorConRetraso(busqueda.trim(), 300);

  const {
    data: socios,
    isPending,
    error,
    refetch,
    isFetching,
  } = useSocios({ q: q || undefined, activo: ACTIVO_POR_FILTRO[estado] });

  const esAdmin = useAuthStore((state) => state.usuario?.rol === "ADMIN");
  const cambioDeEstado = useActualizarSocio();

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Socio | null>(null);

  function cambiarEstado(socio: Socio) {
    const activar = !socio.activo;
    cambioDeEstado.mutate(
      { id: socio.id, cambios: { activo: activar } },
      {
        onSuccess: () =>
          toast.add({
            type: "success",
            title: activar ? "Socio reactivado" : "Socio dado de baja",
            description: `${socio.nombre} ${socio.apellido}`,
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
          <h1 className="text-xl font-semibold">Socios</h1>
          <p className="text-sm text-muted-foreground">Las personas que entrenan en el gimnasio.</p>
        </div>
        <Button onClick={() => setCreando(true)}>Nuevo socio</Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="search"
          placeholder="Buscar por nombre, apellido o DNI"
          aria-label="Buscar socios"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <NativeSelect
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(event) => setEstado(event.target.value as FiltroEstado)}
        >
          <NativeSelectOption value="activos">Activos</NativeSelectOption>
          <NativeSelectOption value="inactivos">Inactivos</NativeSelectOption>
          <NativeSelectOption value="todos">Todos</NativeSelectOption>
        </NativeSelect>
      </div>

      <Card>
        <CardContent className="px-2">
          {isPending && (
            <p role="status" className="p-4 text-sm text-muted-foreground">
              Cargando socios…
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

          {socios && socios.length === 0 && (
            <p role="status" className="p-4 text-sm text-muted-foreground">
              No hay socios que coincidan con la búsqueda.
            </p>
          )}

          {socios && socios.length > 0 && (
            <SociosTable
              socios={socios}
              esAdmin={esAdmin}
              idCambiandoEstado={
                cambioDeEstado.isPending ? (cambioDeEstado.variables?.id ?? null) : null
              }
              onEditar={setEditando}
              onCambiarEstado={cambiarEstado}
            />
          )}
        </CardContent>
      </Card>

      <CrearSocioDialog abierto={creando} onAbiertoChange={setCreando} />
      <EditarSocioDialog socio={editando} onCerrar={() => setEditando(null)} />
    </div>
  );
}
