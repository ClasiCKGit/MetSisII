import { z } from "zod";

// Los largos máximos son los mismos que valida la API
const obligatorio = (campo: string) =>
  z.string().trim().min(1, `Ingresá ${campo}`).max(60, "Es demasiado largo");

const opcional = (max: number) => z.string().trim().max(max, "Es demasiado largo");

// Vacío es válido (el campo es opcional); si hay algo, tiene que ser un email
const emailOpcional = z
  .string()
  .trim()
  .refine((valor) => valor === "" || z.email().safeParse(valor).success, "El email no es válido");

// Se usa para crear y para editar: en los dos casos se envían todos los campos
export const profesorSchema = z.object({
  nombre: obligatorio("el nombre"),
  apellido: obligatorio("el apellido"),
  dni: opcional(20),
  email: emailOpcional,
  telefono: opcional(30),
  especialidad: opcional(80),
});

export type ProfesorInput = z.infer<typeof profesorSchema>;

// Lo que se envía a la API. Un campo opcional vacío se manda como null ("sin valor"):
// la API rechaza un email "" y guardaría una cadena vacía en los textos.
export function aPayload(valores: ProfesorInput) {
  return {
    nombre: valores.nombre,
    apellido: valores.apellido,
    dni: valores.dni || null,
    email: valores.email || null,
    telefono: valores.telefono || null,
    especialidad: valores.especialidad || null,
  };
}

export type ProfesorPayload = ReturnType<typeof aPayload>;
