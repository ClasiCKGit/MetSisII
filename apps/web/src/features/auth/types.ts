export type Rol = "ADMIN" | "RECEPCIONISTA";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
}

export interface Gimnasio {
  id: string;
  nombre: string;
  slug: string;
}

// Perfil de la sesión: lo que devuelve GET /api/auth/me
export interface Perfil {
  usuario: Usuario;
  gimnasio: Gimnasio;
}

// Respuesta de POST /api/auth/login y /register-gimnasio
export interface Sesion extends Perfil {
  token: string;
}

// Cuerpo de POST /api/auth/register-gimnasio
export interface RegisterPayload {
  gimnasio: { nombre: string; slug: string };
  admin: { nombre: string; apellido: string; email: string; password: string };
}
