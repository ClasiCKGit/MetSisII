import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import type { MembresiaSocio } from "@/api/membresias.api";
import { getErrorMessage } from "@/lib/api-error";
import { useCancelarMembresia } from "../hooks/useInscripcion";

export function CancelarMembresiaDialog({
  membresia,
  onCerrar,
}: {
  membresia: MembresiaSocio | null;
  onCerrar: () => void;
}) {
  const cancelar = useCancelarMembresia();

  function confirmar() {
    if (!membresia) return;
    cancelar.mutate(membresia.id, {
      onSuccess: ({ pagosRechazados }) => {
        toast.add({
          type: "success",
          title: "Membresía cancelada",
          description:
            pagosRechazados === 0
              ? membresia.actividad.nombre
              : `${membresia.actividad.nombre}: ${
                  pagosRechazados === 1
                    ? "1 pago pendiente quedó rechazado"
                    : `${pagosRechazados} pagos pendientes quedaron rechazados`
                }`,
        });
        onCerrar();
      },
    });
  }

  return (
    <Dialog
      open={membresia !== null}
      onOpenChange={(abierto) => {
        if (!abierto) {
          cancelar.reset();
          onCerrar();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar membresía</DialogTitle>
          <DialogDescription>
            {membresia &&
              `¿Cancelar la membresía de ${membresia.actividad.nombre} (${membresia.tipoMembresia.nombre})? `}
            Deja de contar como vigente y libera su lugar en la actividad. Sus pagos pendientes se
            marcan como rechazados; los ya cobrados no cambian. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {cancelar.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(cancelar.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Volver</DialogClose>
          <Button variant="destructive" onClick={confirmar} disabled={cancelar.isPending}>
            {cancelar.isPending ? "Cancelando…" : "Cancelar membresía"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
