import { PencilIcon, PowerIcon, Trash2Icon } from "lucide-react";
import { EstadoActivo } from "@/components/shared/EstadoActivo";
import { Iniciales } from "@/components/shared/Iniciales";
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
  mensajeVacio: string;
  onEditar: (profesor: Profesor) => void;
  onCambiarEstado: (profesor: Profesor) => void;
}

const SIN_DATO = "—";

export function ProfesoresTable({
  profesores,
  puedeEditar,
  idCambiandoEstado,
  mensajeVacio,
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
            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
              {mensajeVacio}
            </TableCell>
          </TableRow>
        )}

        {profesores.map((profesor) => {
          const nombreCompleto = `${profesor.nombre} ${profesor.apellido}`;
          const accionEstado = profesor.activo ? "Dar de baja" : "Reactivar";

          return (
            <TableRow key={profesor.id}>
              <TableCell>
                <div className="flex items-center gap-2.5 font-semibold">
                  <Iniciales nombre={profesor.nombre} apellido={profesor.apellido} />
                  <span className={profesor.activo ? undefined : "opacity-60"}>
                    {nombreCompleto}
                  </span>
                </div>
              </TableCell>
              <TableCell>{profesor.especialidad ?? SIN_DATO}</TableCell>
              <TableCell>
                <div className="text-muted-foreground">{profesor.email ?? SIN_DATO}</div>
                {profesor.telefono && (
                  <div className="text-xs text-muted-foreground">{profesor.telefono}</div>
                )}
              </TableCell>
              <TableCell>
                <EstadoActivo activo={profesor.activo} />
              </TableCell>
              {puedeEditar && (
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Editar a ${nombreCompleto}`}
                      title="Editar"
                      onClick={() => onEditar(profesor)}
                    >
                      <PencilIcon aria-hidden="true" />
                    </Button>
                    {profesor.activo ? (
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${accionEstado} a ${nombreCompleto}`}
                        title={accionEstado}
                        disabled={idCambiandoEstado === profesor.id}
                        onClick={() => onCambiarEstado(profesor)}
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${accionEstado} a ${nombreCompleto}`}
                        title={accionEstado}
                        disabled={idCambiandoEstado === profesor.id}
                        onClick={() => onCambiarEstado(profesor)}
                      >
                        <PowerIcon aria-hidden="true" />
                      </Button>
                    )}
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
