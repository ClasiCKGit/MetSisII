import { z } from "zod";
import { emailSchema } from "../auth/auth.schema";

// Opcionales: omitirlos no toca el dato; mandar null (o texto vacío) lo borra
const textoOpcional = (max: number, mensaje: string) =>
  z
    .string()
    .trim()
    .max(max, mensaje)
    .transform((valor) => valor || null)
    .nullable()
    .optional();

// strictObject: el slug (y cualquier otro campo) se rechaza con 400. El slug no se edita
// porque es lo que el personal escribe para iniciar sesión.
export const actualizarGimnasioSchema = z
  .strictObject({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no puede superar los 100 caracteres")
      .optional(),
    email: emailSchema.nullable().optional(),
    telefono: textoOpcional(30, "Teléfono demasiado largo"),
    direccion: textoOpcional(200, "Dirección demasiado larga"),
  })
  .refine((datos) => Object.keys(datos).length > 0, "Indicá al menos un campo para actualizar");

export type ActualizarGimnasioInput = z.infer<typeof actualizarGimnasioSchema>;
