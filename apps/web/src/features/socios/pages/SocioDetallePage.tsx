import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorMessage, hasStatus } from "@/lib/api-error";
import { EditarSocioDialog } from "../components/SocioDialogs";
import { useSocio } from "../hooks/useSocios";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

// La fecha de nacimiento se guarda como medianoche UTC: se muestra en UTC para que
// en Argentina (UTC-3) no aparezca como el día anterior.
function formatearNacimiento(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

function formatearIngreso(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR");
}

export function SocioDetallePage() {
  const { id = "" } = useParams();
  const { data: socio, isPending, error, refetch, isFetching } = useSocio(id);
  const [editando, setEditando] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Link to="/socios" className="text-sm text-muted-foreground hover:underline">
        ← Volver a socios
      </Link>

      {isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando socio…
        </p>
      )}

      {error && (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-destructive">
            {hasStatus(error, 404) ? "No encontramos a ese socio." : getErrorMessage(error)}
          </p>
          {!hasStatus(error, 404) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Reintentar
            </Button>
          )}
        </div>
      )}

      {socio && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                {socio.nombre} {socio.apellido}
              </h1>
              <Badge variant={socio.activo ? "secondary" : "outline"}>
                {socio.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <Button onClick={() => setEditando(true)}>Editar</Button>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <h2 className="font-medium">Datos personales</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Dato etiqueta="DNI" valor={socio.dni} />
                <Dato etiqueta="Email" valor={socio.email ?? "—"} />
                <Dato etiqueta="Teléfono" valor={socio.telefono ?? "—"} />
                <Dato
                  etiqueta="Fecha de nacimiento"
                  valor={formatearNacimiento(socio.fechaNacimiento)}
                />
                <Dato etiqueta="Fecha de ingreso" valor={formatearIngreso(socio.fechaIngreso)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2">
              <h2 className="font-medium">Membresías</h2>
              <p className="text-sm text-muted-foreground">
                Todavía no disponible: se completa cuando esté listo el módulo de membresías.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2">
              <h2 className="font-medium">Historial de pagos</h2>
              <p className="text-sm text-muted-foreground">
                Todavía no disponible: se completa cuando esté listo el módulo de pagos.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <EditarSocioDialog
        socio={editando ? (socio ?? null) : null}
        onCerrar={() => setEditando(false)}
      />
    </div>
  );
}
