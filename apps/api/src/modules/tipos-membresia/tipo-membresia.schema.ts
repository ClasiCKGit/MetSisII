import { z } from "zod";

const camposTipoMembresia = {
  actividadId: z.uuid(),
  nombre: z.string().trim().min(1).max(100),
  precio: z.coerce.number().finite().nonnegative(),
  duracionDias: z.coerce.number().int().positive(),
  cantidadClases: z.coerce.number().int().positive().nullable().optional(),
  activo: z.boolean().optional(),
};

export const crearTipoMembresiaSchema = z.object(camposTipoMembresia);

export const actualizarTipoMembresiaSchema = z
  .object({ ...camposTipoMembresia, actividadId: z.uuid().optional() })
  .partial()
  .refine(
    (valores) => Object.keys(valores).length > 0,
    "Debe enviar al menos un campo para actualizar"
  );

export type CrearTipoMembresiaInput = z.infer<typeof crearTipoMembresiaSchema>;
export type ActualizarTipoMembresiaInput = z.infer<typeof actualizarTipoMembresiaSchema>;
