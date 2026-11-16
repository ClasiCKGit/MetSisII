import { KeyRoundIcon, PencilIcon, PowerIcon } from "lucide-react";
import { EstadoActivo } from "@/components/shared/EstadoActivo";
import { Iniciales } from "@/components/shared/Iniciales";
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
          const accionEstado = usuario.activo ? "Desactivar" : "Activar";

          return (
            <TableRow key={usuario.id}>
              <TableCell>
                <div className="flex items-center gap-2.5 font-semibold">
                  <Iniciales nombre={usuario.nombre} apellido={usuario.apellido} />
                  <span className={usuario.activo ? undefined : "opacity-60"}>
                    {nombreCompleto}
                  </span>
                  {esUnoMismo && <Badge variant="outline">Vos</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{usuario.email}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    usuario.rol === "ADMIN"
                      ? "bg-primary-soft font-bold text-primary-soft-foreground"
                      : undefined
                  }
                >
                  {ROL_LABEL[usuario.rol]}
                </Badge>
              </TableCell>
              <TableCell>
                <EstadoActivo activo={usuario.activo} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Editar a ${nombreCompleto}`}
                    title="Editar"
                    onClick={() => onEditar(usuario)}
                  >
                    <PencilIcon aria-hidden="true" />
                  </Button>
                  {!esUnoMismo && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Restablecer la contraseña de ${nombreCompleto}`}
                        title="Restablecer contraseña"
                        onClick={() => onResetear(usuario)}
                      >
                        <KeyRoundIcon aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`${accionEstado} a ${nombreCompleto}`}
                        title={accionEstado}
                        disabled={idCambiandoEstado === usuario.id}
                        onClick={() => onCambiarEstado(usuario)}
                      >
                        <PowerIcon aria-hidden="true" />
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
