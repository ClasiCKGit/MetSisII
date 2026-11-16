import { cn } from "cn";

interface EstadoActivoProps {
  activo: boolean;
  // Las actividades son femeninas ("Activa"); el resto, masculino
  femenino?: boolean;
}

/** Estado de un registro como punto de color + texto (el texto evita depender solo del color). */
export function EstadoActivo({ activo, femenino = false }: EstadoActivoProps) {
  const sufijo = femenino ? "a" : "o";

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", activo ? "bg-success" : "bg-muted-foreground/60")}
      />
      {activo ? `Activ${sufijo}` : `Inactiv${sufijo}`}
    </span>
  );
}
