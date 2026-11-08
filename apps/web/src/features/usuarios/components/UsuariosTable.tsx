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
import { ROL_LABEL, type UsuarioListado } from "../types";

interface UsuariosTableProps {
  usuarios: UsuarioListado[];
  // Id del usuario logueado: sobre sí mismo no se permite desactivarse ni resetear la contraseña
  yoId: string | undefined;
  idCambiandoEstado: string | null;
  onEditar: (usuario: UsuarioListado) => void;
  onResetear: (usuario: UsuarioListado) => void;
  onCambiarEstado: (usuario: UsuarioListado) => void;
}

export function UsuariosTable({
  usuarios,
  yoId,
  idCambiandoEstado,
  onEditar,
  onResetear,
  onCambiarEstado,
}: UsuariosTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((usuario) => {
          const esUnoMismo = usuario.id === yoId;
          const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;

          return (
            <TableRow key={usuario.id}>
              <TableCell>
                {nombreCompleto} {esUnoMismo && <Badge variant="outline">Vos</Badge>}
              </TableCell>
              <TableCell>{usuario.email}</TableCell>
              <TableCell>
                <Badge variant={usuario.rol === "ADMIN" ? "default" : "secondary"}>
                  {ROL_LABEL[usuario.rol]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={usuario.activo ? "secondary" : "outline"}>
                  {usuario.activo ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar a ${nombreCompleto}`}
                    onClick={() => onEditar(usuario)}
                  >
                    Editar
                  </Button>
                  {!esUnoMismo && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`${usuario.activo ? "Desactivar" : "Activar"} a ${nombreCompleto}`}
                        disabled={idCambiandoEstado === usuario.id}
                        onClick={() => onCambiarEstado(usuario)}
                      >
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Restablecer la contraseña de ${nombreCompleto}`}
                        onClick={() => onResetear(usuario)}
                      >
                        Contraseña
                      </Button>
                    </>
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
