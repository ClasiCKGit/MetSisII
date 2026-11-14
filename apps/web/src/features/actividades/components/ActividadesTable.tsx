import { Badge } from "@/components/ui/badge";
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
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              Todavía no hay actividades cargadas.
            </TableCell>
          </TableRow>
        )}

        {actividades.map((actividad) => (
          <TableRow key={actividad.id}>
            <TableCell>
              <div>{actividad.nombre}</div>
              {actividad.descripcion && (
                <div className="text-xs text-muted-foreground">{actividad.descripcion}</div>
              )}
            </TableCell>
            <TableCell>{actividad.cupo ?? "Sin límite"}</TableCell>
            <TableCell>
              <Badge variant={actividad.activa ? "secondary" : "outline"}>
                {actividad.activa ? "Activa" : "Inactiva"}
              </Badge>
            </TableCell>
            {puedeEditar && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar ${actividad.nombre}`}
                    onClick={() => onEditar(actividad)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${actividad.activa ? "Desactivar" : "Activar"} ${actividad.nombre}`}
                    disabled={idCambiandoEstado === actividad.id}
                    onClick={() => onCambiarEstado(actividad)}
                  >
                    {actividad.activa ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
