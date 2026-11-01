import bcrypt from "bcrypt";
import { prisma } from "../../config/database";
import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import { signToken } from "../../utils/jwt";
import { BCRYPT_ROUNDS, comparePassword, hashPassword } from "../../utils/password";
import type { ChangePasswordInput, LoginInput, RegisterGimnasioInput } from "./auth.schema";
import type { AuthContext } from "./auth.types";

// Hash ficticio: si el usuario no existe igual hacemos un compare, para que el
// tiempo de respuesta no revele qué emails están registrados.
const DUMMY_HASH = bcrypt.hashSync("fitmanager-dummy-password", BCRYPT_ROUNDS);

function buildSession(
  usuario: { id: string; email: string; nombre: string; apellido: string; rol: string },
  gimnasio: { id: string; nombre: string; slug: string }
) {
  return {
    token: signToken({ usuarioId: usuario.id, gimnasioId: gimnasio.id }),
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
    },
    gimnasio: { id: gimnasio.id, nombre: gimnasio.nombre, slug: gimnasio.slug },
  };
}

export async function registerGimnasio(input: RegisterGimnasioInput) {
  const existente = await prisma.gimnasio.findUnique({ where: { slug: input.gimnasio.slug } });
  if (existente) {
    throw new AppError(409, "Ese identificador de gimnasio ya está en uso");
  }

  const passwordHash = await hashPassword(input.admin.password);

  const { gimnasio, usuario } = await prisma.$transaction(async (tx) => {
    const gimnasio = await tx.gimnasio.create({ data: input.gimnasio });
    const usuario = await tx.usuario.create({
      data: {
        gimnasioId: gimnasio.id,
        email: input.admin.email,
        passwordHash,
        nombre: input.admin.nombre,
        apellido: input.admin.apellido,
        rol: "ADMIN",
      },
    });
    return { gimnasio, usuario };
  });

  return buildSession(usuario, gimnasio);
}

export async function login({ gimnasioSlug, email, password }: LoginInput) {
  const gimnasio = await prisma.gimnasio.findUnique({ where: { slug: gimnasioSlug } });

  const usuario = gimnasio?.activo
    ? await prisma.usuario.findUnique({
        where: { gimnasioId_email: { gimnasioId: gimnasio.id, email } },
      })
    : null;

  const passwordOk = await comparePassword(password, usuario?.passwordHash ?? DUMMY_HASH);

  // Mismo mensaje para todos los casos, no se revela cuál falló
  if (!gimnasio || !usuario || !usuario.activo || !passwordOk) {
    throw new AppError(401, "Credenciales inválidas");
  }

  return buildSession(usuario, gimnasio);
}

export async function changePassword(
  db: TenantClient,
  actor: AuthContext,
  { currentPassword, newPassword }: ChangePasswordInput
) {
  const usuario = await db.usuario.findUnique({
    where: { id: actor.usuarioId },
    select: { passwordHash: true },
  });
  if (!usuario) {
    throw new AppError(401, "Usuario inactivo o inexistente");
  }

  // Se responde 400 y no 401 a propósito: el frontend interpreta un 401 como
  // sesión vencida y cierra la sesión, y acá el usuario solo se equivocó de contraseña.
  if (!(await comparePassword(currentPassword, usuario.passwordHash))) {
    throw new AppError(400, "La contraseña actual es incorrecta");
  }
  if (currentPassword === newPassword) {
    throw new AppError(400, "La nueva contraseña tiene que ser distinta de la actual");
  }

  await db.usuario.update({
    where: { id: actor.usuarioId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}
