import { Badge } from "@/components/ui/badge";
import { ESTADO_PAGO_LABEL } from "../formato";
import type { EstadoPago } from "../types";

const ESTILOS: Record<EstadoPago, string> = {
  PAGADO: "border-success/30 bg-success/10 text-success",
  PENDIENTE: "border-warning/30 bg-warning/10 text-warning",
  RECHAZADO: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function EstadoPagoBadge({ estado }: { estado: EstadoPago }) {
  return (
    <Badge variant="outline" className={ESTILOS[estado]}>
      {ESTADO_PAGO_LABEL[estado]}
    </Badge>
  );
}
