import type { Rol } from "@/features/auth/types";

// Un usuario tal como lo devuelve GET /api/usuarios (nunca incluye la contraseña)
export interface UsuarioListado {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
}

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN: "Administrador",
  RECEPCIONISTA: "Recepcionista",
};
