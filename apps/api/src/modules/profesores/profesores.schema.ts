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

// Campo de texto opcional: se puede omitir (no se toca) o mandar null (se borra)
const textoOpcional = (max: number) =>
  z.string().trim().max(max, "Texto demasiado largo").nullable().optional();

export const crearProfesorSchema = z.object({
  nombre: nombreSchema,
  apellido: apellidoSchema,
  dni: textoOpcional(20),
  email: emailSchema.nullable().optional(),
  telefono: textoOpcional(30),
  especialidad: textoOpcional(80),
});

// strictObject: un campo no permitido (por ejemplo gimnasioId) se rechaza con 400
// en lugar de ignorarse en silencio.
export const actualizarProfesorSchema = z
  .strictObject({
    nombre: nombreSchema.optional(),
    apellido: apellidoSchema.optional(),
    dni: textoOpcional(20),
    email: emailSchema.nullable().optional(),
    telefono: textoOpcional(30),
    especialidad: textoOpcional(80),
    activo: z.boolean().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, "Indicá al menos un campo para actualizar");

export const idParamsSchema = z.object({
  id: z.uuid("El id no es válido"),
});

export type CrearProfesorInput = z.infer<typeof crearProfesorSchema>;
export type ActualizarProfesorInput = z.infer<typeof actualizarProfesorSchema>;
