import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EncabezadoPantalla } from "@/components/shared/EncabezadoPantalla";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSocios } from "@/features/socios/hooks/useSocios";
import { getErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { EstadoPagoBadge } from "../components/EstadoPagoBadge";
import { ExportarPagosButton } from "../components/ExportarPagosButton";
import {
  aCentavos,
  conceptoDePago,
  formatearCentavos,
  formatearFechaPago,
  formatearMonto,
  METODO_PAGO_LABEL,
  nombreReportePagos,
} from "../formato";
import { usePagos } from "../hooks/usePagos";
import type { EstadoPago, FiltrosPagos } from "../types";

interface FiltrosPantalla {
  desde: string;
  hasta: string;
  socioId: string;
  estado: "TODOS" | EstadoPago;
}

function fechaLocalIso(fecha: string, finDelDia = false): string | undefined {
  if (!fecha) return undefined;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const valor = finDelDia
    ? new Date(anio, mes - 1, dia, 23, 59, 59, 999)
    : new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  return valor.toISOString();
}

function TarjetaResumen({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    // El valor va al pie (mt-auto): si un título ocupa dos líneas, los tres montos siguen alineados
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <h2 className="rotulo text-card-foreground/80">{titulo}</h2>
      <p className="mt-auto font-heading text-3xl font-black tabular-nums">{valor}</p>
    </article>
  );
}

export function PagosPage() {
  const [filtros, setFiltros] = useState<FiltrosPantalla>({
    desde: "",
    hasta: "",
    socioId: "",
    estado: "TODOS",
  });
  // El reporte de ingresos lo exporta solo el administrador (la API responde 403 a recepción)
  const puedeExportar = useAuthStore((state) => state.usuario?.rol === "ADMIN");
  const socios = useSocios({});
  const filtrosApi = useMemo<FiltrosPagos>(
    () => ({
      desde: fechaLocalIso(filtros.desde),
      hasta: fechaLocalIso(filtros.hasta, true),
      socioId: filtros.socioId || undefined,
      estado: filtros.estado === "TODOS" ? undefined : filtros.estado,
    }),
    [filtros]
  );
  const pagos = usePagos(filtrosApi);

  const totales = useMemo(() => {
    const registros = pagos.data ?? [];
    const pagado = registros
      .filter((pago) => pago.estado === "PAGADO")
      .reduce((total, pago) => total + aCentavos(pago.monto), 0n);
    const pendiente = registros
      .filter((pago) => pago.estado === "PENDIENTE")
      .reduce((total, pago) => total + aCentavos(pago.monto), 0n);
    return { cantidad: registros.length, pagado, pendiente };
  }, [pagos.data]);

  function actualizar<K extends keyof FiltrosPantalla>(campo: K, valor: FiltrosPantalla[K]) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }));
  }

  function limpiarFiltros() {
    setFiltros({ desde: "", hasta: "", socioId: "", estado: "TODOS" });
  }

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPantalla
        titulo="Pagos"
        descripcion="Consultá los cobros del gimnasio y filtrá por período, socio o estado."
        accion={
          puedeExportar && (
            <ExportarPagosButton
              filtros={filtrosApi}
              nombreArchivo={nombreReportePagos(filtros.desde, filtros.hasta)}
              disabled={!pagos.data?.length}
            />
          )
        }
      />

      <section aria-label="Resumen de pagos filtrados" className="grid gap-4 sm:grid-cols-3">
        <TarjetaResumen titulo="Pagos encontrados" valor={String(totales.cantidad)} />
        <TarjetaResumen titulo="Total pagado" valor={formatearCentavos(totales.pagado)} />
        <TarjetaResumen titulo="Total pendiente" valor={formatearCentavos(totales.pendiente)} />
      </section>

      <section aria-label="Filtros de pagos" className="rounded-xl border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_1fr_auto] xl:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pagos-desde" className="text-sm font-medium">
              Desde
            </label>
            <Input
              id="pagos-desde"
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(event) => actualizar("desde", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pagos-hasta" className="text-sm font-medium">
              Hasta
            </label>
            <Input
              id="pagos-hasta"
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(event) => actualizar("hasta", event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pagos-socio" className="text-sm font-medium">
              Socio
            </label>
            <NativeSelect
              id="pagos-socio"
              value={filtros.socioId}
              disabled={socios.isPending || Boolean(socios.error)}
              onChange={(event) => actualizar("socioId", event.target.value)}
            >
              <NativeSelectOption value="">Todos los socios</NativeSelectOption>
              {socios.data?.map((socio) => (
                <NativeSelectOption key={socio.id} value={socio.id}>
                  {socio.apellido}, {socio.nombre}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {socios.error && (
              <p className="text-xs text-destructive">No se pudieron cargar los socios.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pagos-estado" className="text-sm font-medium">
              Estado
            </label>
            <NativeSelect
              id="pagos-estado"
              value={filtros.estado}
              onChange={(event) =>
                actualizar("estado", event.target.value as FiltrosPantalla["estado"])
              }
            >
              <NativeSelectOption value="TODOS">Todos los estados</NativeSelectOption>
              <NativeSelectOption value="PAGADO">Pagado</NativeSelectOption>
              <NativeSelectOption value="PENDIENTE">Pendiente</NativeSelectOption>
              <NativeSelectOption value="RECHAZADO">Rechazado</NativeSelectOption>
            </NativeSelect>
          </div>
          <Button variant="outline" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        </div>
      </section>

      <section aria-label="Listado de pagos" className="overflow-hidden rounded-xl border bg-card">
        {pagos.isPending && (
          <p role="status" className="p-4 text-sm text-muted-foreground">
            Cargando pagos…
          </p>
        )}

        {pagos.error && (
          <div role="alert" className="flex flex-col items-start gap-3 p-4">
            <p className="text-sm text-destructive">{getErrorMessage(pagos.error)}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void pagos.refetch()}
              disabled={pagos.isFetching}
            >
              Reintentar
            </Button>
          </div>
        )}

        {pagos.data && pagos.data.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No hay pagos que coincidan con esos filtros.
          </p>
        )}

        {pagos.data && pagos.data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.data.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatearFechaPago(pago.fecha)}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/socios/${pago.socio.id}`}
                        className="font-semibold hover:text-primary hover:underline"
                      >
                        {pago.socio.nombre} {pago.socio.apellido}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{conceptoDePago(pago)}</TableCell>
                    <TableCell>{METODO_PAGO_LABEL[pago.metodoPago]}</TableCell>
                    <TableCell>
                      <EstadoPagoBadge estado={pago.estado} />
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatearMonto(pago.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
