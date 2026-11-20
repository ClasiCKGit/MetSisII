import { z } from "zod";

const nombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el nombre")
  .max(80, "El nombre es demasiado largo");

const descripcionSchema = z.string().trim().max(500, "La descripción es demasiado larga");

const cupoSchema = z
  .string()
  .trim()
  .refine(
    (valor) => valor === "" || (/^\d{1,6}$/.test(valor) && Number(valor) > 0),
    "El cupo debe ser un número entero mayor a 0"
  );

export const actividadSchema = z.object({
  nombre: nombreSchema,
  descripcion: descripcionSchema,
  cupo: cupoSchema,
});

export type ActividadInput = z.infer<typeof actividadSchema>;

export function aPayload(valores: ActividadInput) {
  return {
    nombre: valores.nombre,
    descripcion: valores.descripcion || null,
    cupo: valores.cupo ? Number(valores.cupo) : null,
  };
}

export type ActividadPayload = ReturnType<typeof aPayload>;
