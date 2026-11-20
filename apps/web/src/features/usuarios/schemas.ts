import { z } from "zod";

const nombre = (campo: string) =>
  z.string().trim().min(1, `Ingresá ${campo}`).max(60, "Es demasiado largo");

const email = z.string().trim().min(1, "Ingresá el email").pipe(z.email("El email no es válido"));

const rol = z.enum(["ADMIN", "RECEPCIONISTA"]);

const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña no puede superar los 72 caracteres");

export const crearUsuarioSchema = z.object({
  nombre: nombre("el nombre"),
  apellido: nombre("el apellido"),
  email,
  password,
  rol,
});

export const editarUsuarioSchema = z.object({
  nombre: nombre("el nombre"),
  apellido: nombre("el apellido"),
  rol,
});

export const resetPasswordSchema = z.object({ password });

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
