import { PencilIcon, PowerIcon } from "lucide-react";
import { Link } from "react-router-dom";
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
import type { Socio } from "../types";

const SIN_DATO = "—";

interface SociosTableProps {
  socios: Socio[];
  // Solo los administradores pueden dar de baja o reactivar
  esAdmin: boolean;
  idCambiandoEstado: string | null;
  onEditar: (socio: Socio) => void;
  onCambiarEstado: (socio: Socio) => void;
}

export function SociosTable({
  socios,
  esAdmin,
  idCambiandoEstado,
  onEditar,
  onCambiarEstado,
}: SociosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>DNI</TableHead>
          <TableHead>Contacto</TableHead>
          <TableHead>Ingreso</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {socios.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
              No hay socios que coincidan con la búsqueda.
            </TableCell>
          </TableRow>
        )}

        {socios.map((socio) => {
          // Apellido primero, como el orden de la lista
          const nombreCompleto = `${socio.apellido}, ${socio.nombre}`;
          const accionEstado = socio.activo ? "Dar de baja" : "Reactivar";

          return (
            <TableRow key={socio.id}>
              <TableCell>
                <div className="flex items-center gap-2.5 font-semibold">
                  <Iniciales nombre={socio.nombre} apellido={socio.apellido} />
                  <Link
                    to={`/socios/${socio.id}`}
                    className={
                      socio.activo
                        ? "transition-colors hover:text-primary"
                        : "opacity-60 transition-colors hover:text-primary"
                    }
                  >
                    {nombreCompleto}
                  </Link>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{socio.dni}</TableCell>
              <TableCell>
                <div className="text-muted-foreground">{socio.email ?? SIN_DATO}</div>
                {socio.telefono && (
                  <div className="text-xs text-muted-foreground">{socio.telefono}</div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {new Date(socio.fechaIngreso).toLocaleDateString("es-AR")}
              </TableCell>
              <TableCell>
                <EstadoActivo activo={socio.activo} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Editar a ${nombreCompleto}`}
                    title="Editar"
                    onClick={() => onEditar(socio)}
                  >
                    <PencilIcon aria-hidden="true" />
                  </Button>
                  {esAdmin && (
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`${accionEstado} a ${nombreCompleto}`}
                      title={accionEstado}
                      disabled={idCambiandoEstado === socio.id}
                      onClick={() => onCambiarEstado(socio)}
                    >
                      <PowerIcon aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
