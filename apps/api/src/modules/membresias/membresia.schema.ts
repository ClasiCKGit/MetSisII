import { z } from "zod";
import { ESTADOS_VIGENCIA } from "./vigencia";

const metodoPagoSchema = z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MERCADO_PAGO"]);

export const inscribirSocioSchema = z.object({
  socioId: z.uuid(),
  actividadId: z.uuid(),
  tipoMembresiaId: z.uuid(),
  metodoPago: metodoPagoSchema,
  fechaInicio: z.iso.datetime().optional(),
});

// La fecha de inicio no se elige: es el fin de la membresía que se renueva (o hoy, si venció).
// Sin tipoMembresiaId se renueva con el mismo tipo.
export const renovarMembresiaSchema = z.strictObject({
  tipoMembresiaId: z.uuid().optional(),
  metodoPago: metodoPagoSchema,
});

export const listarMembresiasQuerySchema = z.object({
  socioId: z.uuid().optional(),
  estado: z.enum(["ACTIVA", "VENCIDA", "CANCELADA"]).optional(),
  vigencia: z.enum(ESTADOS_VIGENCIA).optional(),
  // false = solo las que el socio todavía no renovó (ni se volvió a inscribir)
  renovada: z.stringbool().optional(),
});

export const membresiaIdParamSchema = z.object({ id: z.uuid("Id de membresía inválido") });

export type InscribirSocioInput = z.infer<typeof inscribirSocioSchema>;
export type RenovarMembresiaInput = z.infer<typeof renovarMembresiaSchema>;
export type ListarMembresiasQuery = z.infer<typeof listarMembresiasQuerySchema>;
