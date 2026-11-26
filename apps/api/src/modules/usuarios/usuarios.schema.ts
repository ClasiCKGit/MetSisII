import { z } from "zod";
import { emailSchema, passwordSchema } from "../auth/auth.schema";
import { rolSchema } from "../auth/auth.types";

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

export const crearUsuarioSchema = z.object({
  nombre: nombreSchema,
  apellido: apellidoSchema,
  email: emailSchema,
  password: passwordSchema,
  // Mínimo privilegio: si no se indica el rol, se crea como recepcionista
  rol: rolSchema.default("RECEPCIONISTA"),
});

// strictObject: un campo no permitido (por ejemplo email o passwordHash) se rechaza con 400
// en lugar de ignorarse en silencio.
export const actualizarUsuarioSchema = z
  .strictObject({
    nombre: nombreSchema.optional(),
    apellido: apellidoSchema.optional(),
    rol: rolSchema.optional(),
    activo: z.boolean().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, "Indicá al menos un campo para actualizar");

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const idParamsSchema = z.object({
  id: z.uuid("El id no es válido"),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
