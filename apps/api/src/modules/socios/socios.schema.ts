import { z } from "zod";
import { emailSchema } from "../auth/auth.schema";

export const createSocioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(60, "Nombre demasiado largo"),
  apellido: z
    .string()
    .trim()
    .min(1, "El apellido es obligatorio")
    .max(60, "Apellido demasiado largo"),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos, sin puntos"),
  email: emailSchema.optional(),
  telefono: z.string().trim().max(30, "Teléfono demasiado largo").optional(),
  fechaNacimiento: z.coerce
    .date("Fecha de nacimiento inválida")
    .refine((fecha) => fecha <= new Date(), "La fecha de nacimiento no puede ser futura")
    .optional(),
});

export const updateSocioSchema = createSocioSchema
  .partial()
  .extend({ activo: z.boolean().optional() })
  .refine((data) => Object.keys(data).length > 0, "Enviá al menos un campo para actualizar");

export const listSociosQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  activo: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),
});

export const socioIdParamSchema = z.object({
  id: z.uuid("Id inválido"),
});

export type CreateSocioInput = z.infer<typeof createSocioSchema>;
export type UpdateSocioInput = z.infer<typeof updateSocioSchema>;
export type ListSociosQuery = z.infer<typeof listSociosQuerySchema>;
