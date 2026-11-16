import { z } from "zod";
import { emailSchema } from "../auth/auth.schema";

const nombreSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(60, "Nombre demasiado largo");

const apellidoSchema = z
  .string()
  .trim()
  .min(1, "El apellido es obligatorio")
  .max(60, "Apellido demasiado largo");

const dniSchema = z
  .string()
  .trim()
  .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos, sin puntos");

// Campos opcionales: omitirlos no toca el dato; mandar null lo borra
const emailOpcional = emailSchema.nullable().optional();
const telefonoOpcional = z
  .string()
  .trim()
  .max(30, "Teléfono demasiado largo")
  .nullable()
  .optional();
const fechaNacimientoOpcional = z.coerce
  .date("Fecha de nacimiento inválida")
  .refine((fecha) => fecha <= new Date(), "La fecha de nacimiento no puede ser futura")
  .nullable()
  .optional();

export const createSocioSchema = z.object({
  nombre: nombreSchema,
  apellido: apellidoSchema,
  dni: dniSchema,
  email: emailOpcional,
  telefono: telefonoOpcional,
  fechaNacimiento: fechaNacimientoOpcional,
});

export const updateSocioSchema = z
  .strictObject({
    nombre: nombreSchema.optional(),
    apellido: apellidoSchema.optional(),
    dni: dniSchema.optional(),
    email: emailOpcional,
    telefono: telefonoOpcional,
    fechaNacimiento: fechaNacimientoOpcional,
    activo: z.boolean().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, "Enviá al menos un campo para actualizar");

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
