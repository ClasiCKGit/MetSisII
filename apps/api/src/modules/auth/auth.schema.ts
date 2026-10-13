import { z } from "zod";

// Slugs que no se pueden usar porque van a servir como subdominios
const RESERVED_SLUGS = ["www", "api", "app", "admin", "login", "static", "assets"];

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Email inválido"));

// bcrypt solo considera los primeros 72 bytes; el máximo evita truncados silenciosos
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar los 72 caracteres");

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "El identificador debe tener al menos 3 caracteres")
  .max(40, "El identificador no puede superar los 40 caracteres")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Solo minúsculas, números y guiones (sin guiones al inicio o al final)"
  )
  .refine((slug) => !RESERVED_SLUGS.includes(slug), "Ese identificador está reservado");

export const registerGimnasioSchema = z.object({
  gimnasio: z.object({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no puede superar los 100 caracteres"),
    slug: slugSchema,
    email: emailSchema.optional(),
    telefono: z.string().trim().max(30, "Teléfono demasiado largo").optional(),
    direccion: z.string().trim().max(200, "Dirección demasiado larga").optional(),
  }),
  admin: z.object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").max(60, "Nombre demasiado largo"),
    apellido: z
      .string()
      .trim()
      .min(1, "El apellido es obligatorio")
      .max(60, "Apellido demasiado largo"),
    email: emailSchema,
    password: passwordSchema,
  }),
});

export const loginSchema = z.object({
  gimnasioSlug: z.string().trim().toLowerCase().min(1, "El gimnasio es obligatorio"),
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type RegisterGimnasioInput = z.infer<typeof registerGimnasioSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
