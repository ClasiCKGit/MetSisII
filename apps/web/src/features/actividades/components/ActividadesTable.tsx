import { DumbbellIcon, PencilIcon, PowerIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { EstadoActivo } from "@/components/shared/EstadoActivo";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Actividad } from "../types";

interface ActividadesTableProps {
  actividades: Actividad[];
  // Solo los administradores modifican; la recepción solo consulta
  puedeEditar: boolean;
  idCambiandoEstado: string | null;
  onEditar: (actividad: Actividad) => void;
  onCambiarEstado: (actividad: Actividad) => void;
}

export function ActividadesTable({
  actividades,
  puedeEditar,
  idCambiandoEstado,
  onEditar,
  onCambiarEstado,
}: ActividadesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Actividad</TableHead>
          <TableHead>Cupo</TableHead>
          <TableHead>Estado</TableHead>
          {puedeEditar && (
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {actividades.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
              Todavía no hay actividades cargadas.
            </TableCell>
          </TableRow>
        )}

        {actividades.map((actividad) => {
          const accionEstado = actividad.activa ? "Desactivar" : "Activar";

          return (
            <TableRow key={actividad.id}>
              <TableCell>
                <div
                  className={
                    actividad.activa
                      ? "flex items-center justify-center gap-2.5"
                      : "flex items-center justify-center gap-2.5 opacity-60"
                  }
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground"
                  >
                    <DumbbellIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <Link
                      to={`/actividades/${actividad.id}`}
                      className="font-bold hover:text-primary hover:underline"
                    >
                      {actividad.nombre}
                    </Link>
                    {actividad.descripcion && (
                      <div className="truncate text-xs text-muted-foreground">
                        {actividad.descripcion}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-heading font-extrabold">
                {actividad.cupo ?? "Sin límite"}
              </TableCell>
              <TableCell>
                <EstadoActivo activo={actividad.activa} femenino />
              </TableCell>
              {puedeEditar && (
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Editar ${actividad.nombre}`}
                      title="Editar"
                      onClick={() => onEditar(actividad)}
                    >
                      <PencilIcon aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`${accionEstado} ${actividad.nombre}`}
                      title={accionEstado}
                      disabled={idCambiandoEstado === actividad.id}
                      onClick={() => onCambiarEstado(actividad)}
                    >
                      <PowerIcon aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
