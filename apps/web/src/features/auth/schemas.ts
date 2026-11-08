import { z } from "zod";
import type { RegisterPayload } from "./types";

// Las mismas reglas que valida la API (apps/api/src/modules/auth/auth.schema.ts):
// se validan también acá para avisar antes de hacer la petición. Si cambian en la API,
// hay que actualizarlas acá (más adelante pueden salir de un paquete compartido).

// Identificadores que la API reserva (se van a usar como subdominios)
const SLUGS_RESERVADOS = ["www", "api", "app", "admin", "login", "static", "assets"];

const emailSchema = z
  .string()
  .trim()
  .min(1, "Ingresá tu email")
  .pipe(z.email("El email no es válido"));

// bcrypt solo usa los primeros 72 bytes: la API limita el largo para evitar truncados silenciosos
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar los 72 caracteres");

const nombrePersonaSchema = (campo: string) =>
  z.string().trim().min(1, `Ingresá ${campo}`).max(60, "Es demasiado largo");

export const loginSchema = z.object({
  gimnasioSlug: z.string().trim().toLowerCase().min(1, "Ingresá el identificador de tu gimnasio"),
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    gimnasioNombre: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no puede superar los 100 caracteres"),
    gimnasioSlug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "El identificador debe tener al menos 3 caracteres")
      .max(40, "El identificador no puede superar los 40 caracteres")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Solo minúsculas, números y guiones (sin guiones al inicio o al final)"
      )
      .refine((slug) => !SLUGS_RESERVADOS.includes(slug), "Ese identificador está reservado"),
    adminNombre: nombrePersonaSchema("tu nombre"),
    adminApellido: nombrePersonaSchema("tu apellido"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Repetí la contraseña"),
  })
  .refine((datos) => datos.password === datos.confirmPassword, {
    error: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// El formulario es plano; la API espera el gimnasio y el administrador por separado
export function toRegisterPayload(valores: RegisterInput): RegisterPayload {
  return {
    gimnasio: { nombre: valores.gimnasioNombre, slug: valores.gimnasioSlug },
    admin: {
      nombre: valores.adminNombre,
      apellido: valores.adminApellido,
      email: valores.email,
      password: valores.password,
    },
  };
}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Repetí la nueva contraseña"),
  })
  .refine((datos) => datos.newPassword === datos.confirmNewPassword, {
    error: "Las contraseñas no coinciden",
    path: ["confirmNewPassword"],
  })
  .refine((datos) => datos.newPassword !== datos.currentPassword, {
    error: "La nueva contraseña tiene que ser distinta de la actual",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
