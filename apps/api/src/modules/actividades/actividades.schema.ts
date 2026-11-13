import { z } from "zod";

const nombreSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(80, "Nombre demasiado largo");

// Se puede omitir (no se toca) o mandar null (se borra)
const descripcionSchema = z
  .string()
  .trim()
  .max(500, "Descripción demasiado larga")
  .nullable()
  .optional();

// null significa "sin límite de cupo"
const cupoSchema = z
  .number("El cupo debe ser un número")
  .int("El cupo debe ser un número entero")
  .positive("El cupo debe ser mayor a 0")
  .nullable()
  .optional();

export const crearActividadSchema = z.object({
  nombre: nombreSchema,
  descripcion: descripcionSchema,
  cupo: cupoSchema,
});

// strictObject: un campo no permitido (por ejemplo gimnasioId) se rechaza con 400
// en lugar de ignorarse en silencio.
export const actualizarActividadSchema = z
  .strictObject({
    nombre: nombreSchema.optional(),
    descripcion: descripcionSchema,
    cupo: cupoSchema,
    activa: z.boolean().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, "Indicá al menos un campo para actualizar");

export const idParamsSchema = z.object({
  id: z.uuid("El id no es válido"),
});

export type CrearActividadInput = z.infer<typeof crearActividadSchema>;
export type ActualizarActividadInput = z.infer<typeof actualizarActividadSchema>;

export const vincularProfesorSchema = z.object({
  profesorId: z.uuid("El id del profesor no es válido"),
});

// Para las rutas /actividades/:id/profesores/:profesorId
export const vinculoParamsSchema = z.object({
  id: z.uuid("El id no es válido"),
  profesorId: z.uuid("El id del profesor no es válido"),
});

export type VincularProfesorInput = z.infer<typeof vincularProfesorSchema>;
