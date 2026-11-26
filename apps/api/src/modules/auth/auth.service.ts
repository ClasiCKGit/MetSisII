import bcrypt from "bcrypt";
import { prisma } from "../../config/database";
import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import { signToken } from "../../utils/jwt";
import { BCRYPT_ROUNDS, comparePassword, hashPassword } from "../../utils/password";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterGimnasioInput,
  ResetPasswordInput,
} from "./auth.schema";
import type { AuthContext } from "./auth.types";
import crypto from "node:crypto";
import { env } from "../../config/env";
import { enviarMail } from "../../utils/mailer";
import { logger } from "../../config/logger";

// Hash ficticio: si el usuario no existe igual hacemos un compare, para que el
// tiempo de respuesta no revele qué emails están registrados.
const DUMMY_HASH = bcrypt.hashSync("fitmanager-dummy-password", BCRYPT_ROUNDS);

function buildSession(
  usuario: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    rol: string;
    tokenVersion: number;
  },
  gimnasio: { id: string; nombre: string; slug: string }
) {
  return {
    token: signToken({
      usuarioId: usuario.id,
      gimnasioId: gimnasio.id,
      tokenVersion: usuario.tokenVersion,
    }),
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

/**
 * Cambia la contraseña propia e invalida todas las sesiones abiertas del usuario
 * (incluida la actual). Devuelve una sesión nueva para que quien la cambió siga adentro.
 */
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

  const actualizado = await db.usuario.update({
    where: { id: actor.usuarioId },
    data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
  });

  return buildSession(actualizado, actor.gimnasio);
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Siempre resuelve sin error, exista o no el usuario: el controller responde
 * siempre el mismo mensaje genérico, para no revelar qué emails están registrados.
 */
export async function forgotPassword({ gimnasioSlug, email }: ForgotPasswordInput): Promise<void> {
  const gimnasio = await prisma.gimnasio.findUnique({ where: { slug: gimnasioSlug } });
  logger.info(
    { gimnasioSlug, encontrado: !!gimnasio, activo: gimnasio?.activo },
    "DEBUG forgotPassword: gimnasio"
  );
  const usuario = gimnasio?.activo
    ? await prisma.usuario.findUnique({
        where: { gimnasioId_email: { gimnasioId: gimnasio.id, email } },
      })
    : null;
  logger.info(
    { email, encontrado: !!usuario, activo: usuario?.activo },
    "DEBUG forgotPassword: usuario"
  );
  if (!gimnasio || !usuario || !usuario.activo) return;

  const token = crypto.randomBytes(32).toString("hex");

  // Invalida cualquier link anterior que no se haya usado todavía
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { usuarioId: usuario.id } }),
    prisma.passwordResetToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  await enviarMail({
    to: usuario.email,
    subject: "Restablecer tu contraseña de FitManager",
    html: `
      <p>Hola ${usuario.nombre},</p>
      <p>Recibimos un pedido para restablecer tu contraseña. Si fuiste vos, hacé clic en el siguiente link (válido por 1 hora):</p>
      <p><a href="${link}">${link}</a></p>
      <p>Si no fuiste vos, podés ignorar este mail.</p>
    `,
  });
}

/** Deja inválidos todos los tokens del usuario y cierra cualquier sesión abierta (tokenVersion). */
export async function resetPassword({ token, newPassword }: ResetPasswordInput): Promise<void> {
  const registro = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!registro || registro.expiresAt < new Date()) {
    throw new AppError(400, "El link no es válido o expiró");
  }

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.deleteMany({ where: { usuarioId: registro.usuarioId } }),
  ]);
}
