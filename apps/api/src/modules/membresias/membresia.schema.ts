import { z } from "zod";
import { ESTADOS_VIGENCIA } from "./vigencia";

export const inscribirSocioSchema = z.object({
  socioId: z.uuid(),
  actividadId: z.uuid(),
  tipoMembresiaId: z.uuid(),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MERCADO_PAGO"]),
  fechaInicio: z.iso.datetime().optional(),
});

export const listarMembresiasQuerySchema = z.object({
  socioId: z.uuid().optional(),
  estado: z.enum(["ACTIVA", "VENCIDA", "CANCELADA"]).optional(),
  vigencia: z.enum(ESTADOS_VIGENCIA).optional(),
});

export const membresiaIdParamSchema = z.object({ id: z.uuid("Id de membresía inválido") });

export type InscribirSocioInput = z.infer<typeof inscribirSocioSchema>;
export type ListarMembresiasQuery = z.infer<typeof listarMembresiasQuerySchema>;
