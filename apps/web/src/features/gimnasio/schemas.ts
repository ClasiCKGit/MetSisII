import { z } from "zod";

export const gimnasioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre es demasiado largo"),
  email: z
    .string()
    .trim()
    .refine((valor) => valor === "" || z.email().safeParse(valor).success, "El email no es válido"),
  telefono: z.string().trim().max(30, "Es demasiado largo"),
  direccion: z.string().trim().max(200, "Es demasiado larga"),
});

export type GimnasioInput = z.infer<typeof gimnasioSchema>;

// Los opcionales vacíos se mandan como null: así se borran
export function aPayloadDeGimnasio(valores: GimnasioInput) {
  return {
    nombre: valores.nombre,
    email: valores.email || null,
    telefono: valores.telefono || null,
    direccion: valores.direccion || null,
  };
}

export type GimnasioPayload = ReturnType<typeof aPayloadDeGimnasio>;
