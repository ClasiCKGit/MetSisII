import { z } from "zod";

// La columna es Decimal(10, 2): hasta 8 dígitos enteros y 2 decimales
const PRECIO_MAXIMO = 99_999_999.99;

const precioSchema = z.coerce
  .number()
  .finite()
  .nonnegative()
  .max(PRECIO_MAXIMO, "El precio supera el máximo permitido")
  .refine(
    (precio) => Math.abs(precio * 100 - Math.round(precio * 100)) < 1e-6,
    "El precio puede tener hasta 2 decimales"
  );

const camposTipoMembresia = {
  actividadId: z.uuid(),
  nombre: z.string().trim().min(1).max(100),
  precio: precioSchema,
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

export const tipoMembresiaIdParamsSchema = z.object({
  id: z.uuid("Id de tipo de membresía inválido"),
});

export const listarTiposMembresiaQuerySchema = z.object({
  actividadId: z.uuid("Id de actividad inválido").optional(),
});

export type CrearTipoMembresiaInput = z.infer<typeof crearTipoMembresiaSchema>;
export type ActualizarTipoMembresiaInput = z.infer<typeof actualizarTipoMembresiaSchema>;
