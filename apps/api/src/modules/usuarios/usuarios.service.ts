import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import { hashPassword } from "../../utils/password";
import type { AuthContext } from "../auth/auth.types";
import type { ActualizarUsuarioInput, CrearUsuarioInput } from "./usuarios.schema";

// Campos que se devuelven de un usuario. Nunca incluye passwordHash.
const usuarioSelect = {
  id: true,
  email: true,
  nombre: true,
  apellido: true,
  rol: true,
  activo: true,
  createdAt: true,
} as const;

export function listar(db: TenantClient) {
  return db.usuario.findMany({
    select: usuarioSelect,
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

export async function crear(db: TenantClient, actor: AuthContext, input: CrearUsuarioInput) {
  const existente = await db.usuario.findFirst({
    where: { email: input.email },
    select: { id: true },
  });
  if (existente) {
    throw new AppError(
      409,
      "Ya existe un usuario con ese email en este gimnasio (puede estar desactivado)"
    );
  }

  return db.usuario.create({
    data: {
      gimnasioId: actor.gimnasioId,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      nombre: input.nombre,
      apellido: input.apellido,
      rol: input.rol,
    },
    select: usuarioSelect,
  });
}

export async function actualizar(
  db: TenantClient,
  actor: AuthContext,
  id: string,
  input: ActualizarUsuarioInput
) {
  const objetivo = await db.usuario.findUnique({
    where: { id },
    select: { id: true, rol: true },
  });
  if (!objetivo) {
    throw new AppError(404, "Usuario no encontrado");
  }

  // Regla que mantiene siempre al menos un administrador activo: quien llama es un
  // admin activo (lo verifica authenticate) y no puede quitarse el rol ni desactivarse,
  // así que el gimnasio nunca se queda sin administradores.
  if (id === actor.usuarioId) {
    const cambiaSuRol = input.rol !== undefined && input.rol !== objetivo.rol;
    const seDesactiva = input.activo === false;
    if (cambiaSuRol || seDesactiva) {
      throw new AppError(409, "No podés desactivarte ni cambiar tu propio rol");
    }
  }

  return db.usuario.update({ where: { id }, data: input, select: usuarioSelect });
}

export async function resetearPassword(
  db: TenantClient,
  actor: AuthContext,
  id: string,
  password: string
) {
  // La contraseña propia se cambia con la actual (POST /api/auth/change-password).
  // Si se permitiera acá, una sesión robada podría cambiarla sin conocerla.
  if (id === actor.usuarioId) {
    throw new AppError(
      409,
      "Para cambiar tu propia contraseña usá el cambio de contraseña con tu contraseña actual"
    );
  }

  const objetivo = await db.usuario.findUnique({ where: { id }, select: { id: true } });
  if (!objetivo) {
    throw new AppError(404, "Usuario no encontrado");
  }

  await db.usuario.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });
}
