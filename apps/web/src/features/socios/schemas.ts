import { z } from "zod";

const nombre = (campo: string) =>
  z.string().trim().min(1, `Ingresá ${campo}`).max(60, "Es demasiado largo");

export const socioSchema = z.object({
  nombre: nombre("el nombre"),
  apellido: nombre("el apellido"),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos, sin puntos"),
  email: z
    .string()
    .trim()
    .refine((valor) => valor === "" || z.email().safeParse(valor).success, "El email no es válido"),
  telefono: z.string().trim().max(30, "Es demasiado largo"),
  fechaNacimiento: z
    .string()
    .refine(
      (valor) => valor === "" || new Date(valor) <= new Date(),
      "La fecha de nacimiento no puede ser futura"
    ),
});

export type SocioFormValues = z.infer<typeof socioSchema>;

// Lo que espera la API
export interface SocioInput {
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  telefono?: string;
  fechaNacimiento?: string;
}

// La API rechaza los strings vacíos en email y fechaNacimiento, así que se omiten
export function aSocioInput(valores: SocioFormValues): SocioInput {
  return {
    nombre: valores.nombre,
    apellido: valores.apellido,
    dni: valores.dni,
    email: valores.email || undefined,
    telefono: valores.telefono || undefined,
    fechaNacimiento: valores.fechaNacimiento || undefined,
  };
}
