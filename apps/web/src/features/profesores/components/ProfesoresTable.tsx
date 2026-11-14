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
import type { Profesor } from "../types";

interface ProfesoresTableProps {
  profesores: Profesor[];
  // Solo los administradores modifican; la recepción solo consulta
  puedeEditar: boolean;
  idCambiandoEstado: string | null;
  onEditar: (profesor: Profesor) => void;
  onCambiarEstado: (profesor: Profesor) => void;
}

const SIN_DATO = "—";

export function ProfesoresTable({
  profesores,
  puedeEditar,
  idCambiandoEstado,
  onEditar,
  onCambiarEstado,
}: ProfesoresTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Especialidad</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Estado</TableHead>
          {puedeEditar && (
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {profesores.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Todavía no hay profesores cargados.
            </TableCell>
          </TableRow>
        )}

        {profesores.map((profesor) => {
          const nombreCompleto = `${profesor.nombre} ${profesor.apellido}`;

          return (
            <TableRow key={profesor.id}>
              <TableCell>{nombreCompleto}</TableCell>
              <TableCell>{profesor.especialidad ?? SIN_DATO}</TableCell>
              <TableCell>
                <div>{profesor.email ?? SIN_DATO}</div>
                {profesor.telefono && (
                  <div className="text-xs text-muted-foreground">{profesor.telefono}</div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={profesor.activo ? "secondary" : "outline"}>
                  {profesor.activo ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              {puedeEditar && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar a ${nombreCompleto}`}
                      onClick={() => onEditar(profesor)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${profesor.activo ? "Desactivar" : "Activar"} a ${nombreCompleto}`}
                      disabled={idCambiandoEstado === profesor.id}
                      onClick={() => onCambiarEstado(profesor)}
                    >
                      {profesor.activo ? "Desactivar" : "Activar"}
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
