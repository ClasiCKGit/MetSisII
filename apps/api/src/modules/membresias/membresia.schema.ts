import { z } from "zod";

export const inscribirSocioSchema = z.object({
  socioId: z.uuid(),
  actividadId: z.uuid(),
  tipoMembresiaId: z.uuid(),
  fechaInicio: z.iso.datetime().optional(),
});

export type InscribirSocioInput = z.infer<typeof inscribirSocioSchema>;
