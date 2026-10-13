import { z } from "zod";

export const rolSchema = z.enum(["ADMIN", "RECEPCIONISTA"]);
export type Rol = z.infer<typeof rolSchema>;

export interface AuthContext {
  usuarioId: string;
  gimnasioId: string;
  rol: Rol;
  email: string;
  nombre: string;
  apellido: string;
  gimnasio: { id: string; nombre: string; slug: string };
}
