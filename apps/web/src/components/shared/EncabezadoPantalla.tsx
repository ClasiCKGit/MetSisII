import type { ReactNode } from "react";

interface EncabezadoPantallaProps {
  titulo: string;
  descripcion?: string;
  // Botón principal de la pantalla (por ejemplo "Nuevo usuario")
  accion?: ReactNode;
}

/** Título de pantalla en mayúsculas con su descripción y, opcionalmente, la acción principal. */
export function EncabezadoPantalla({ titulo, descripcion, accion }: EncabezadoPantallaProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="titulo-pantalla">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
    </header>
  );
}
