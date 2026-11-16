import { cn } from "cn";

interface LogoProps {
  className?: string;
  // Clases para el nombre: con "sr-only" queda solo la marca "FM" (barra lateral contraída)
  nombreClassName?: string;
}

/** Marca de FitManager: cuadrado naranja con "FM" en itálica y el nombre al lado. */
export function Logo({ className, nombreClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-[17px] font-black text-primary-foreground italic"
      >
        FM
      </span>
      <span
        className={cn("font-heading text-lg font-black tracking-wide uppercase", nombreClassName)}
      >
        FitManager
      </span>
    </span>
  );
}
