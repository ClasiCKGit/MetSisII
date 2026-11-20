import { cn } from "cn";

interface InicialesProps {
  nombre: string;
  apellido?: string;
  className?: string;
}

/**
 * Círculo con las iniciales de una persona. Es decorativo (aria-hidden): el nombre completo
 * siempre está escrito al lado, y así no ensucia el nombre accesible de la fila de la tabla.
 */
export function Iniciales({ nombre, apellido = "", className }: InicialesProps) {
  const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground",
        className
      )}
    >
      {iniciales}
    </span>
  );
}
