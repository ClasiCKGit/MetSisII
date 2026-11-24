import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api-error";
import { useActualizarEstadoPago } from "../hooks/useActualizarEstadoPago";

/** Botones para cerrar un pago pendiente: cobrarlo o rechazarlo. El cambio no tiene vuelta atrás. */
export function AccionesPagoPendiente({ pagoId, concepto }: { pagoId: string; concepto: string }) {
  const actualizar = useActualizarEstadoPago();

  function cambiar(estado: "PAGADO" | "RECHAZADO") {
    actualizar.mutate(
      { id: pagoId, estado },
      {
        onSuccess: () =>
          toast.add({
            type: "success",
            title: estado === "PAGADO" ? "Pago cobrado" : "Pago rechazado",
            description: concepto,
          }),
        onError: (error) =>
          toast.add({
            type: "error",
            title: "No se pudo actualizar el pago",
            description: getErrorMessage(error),
          }),
      }
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => cambiar("PAGADO")}
        disabled={actualizar.isPending}
        aria-label={`Marcar como cobrado: ${concepto}`}
      >
        <CheckIcon aria-hidden="true" />
        Cobrado
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => cambiar("RECHAZADO")}
        disabled={actualizar.isPending}
        aria-label={`Rechazar: ${concepto}`}
      >
        <XIcon aria-hidden="true" />
        Rechazar
      </Button>
    </div>
  );
}
