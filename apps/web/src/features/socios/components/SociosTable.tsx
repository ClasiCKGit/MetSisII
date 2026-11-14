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
import type { Socio } from "../types";

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
          <TableHead>Email</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Ingreso</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {socios.map((socio) => {
          const nombreCompleto = `${socio.apellido}, ${socio.nombre}`;

          return (
            <TableRow key={socio.id}>
              <TableCell>{nombreCompleto}</TableCell>
              <TableCell>{socio.dni}</TableCell>
              <TableCell>{socio.email ?? "—"}</TableCell>
              <TableCell>{socio.telefono ?? "—"}</TableCell>
              <TableCell>{new Date(socio.fechaIngreso).toLocaleDateString("es-AR")}</TableCell>
              <TableCell>
                <Badge variant={socio.activo ? "secondary" : "outline"}>
                  {socio.activo ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar a ${nombreCompleto}`}
                    onClick={() => onEditar(socio)}
                  >
                    Editar
                  </Button>
                  {esAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${socio.activo ? "Dar de baja" : "Reactivar"} a ${nombreCompleto}`}
                      disabled={idCambiandoEstado === socio.id}
                      onClick={() => onCambiarEstado(socio)}
                    >
                      {socio.activo ? "Dar de baja" : "Reactivar"}
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
