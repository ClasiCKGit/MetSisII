import bcrypt from "bcrypt";
import { prisma } from "../../config/database";
import { AppError } from "../../middlewares/error.middleware";
import { signToken } from "../../utils/jwt";
import type { LoginInput, RegisterGimnasioInput } from "./auth.schema";

const BCRYPT_ROUNDS = 10;

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

  const passwordHash = await bcrypt.hash(input.admin.password, BCRYPT_ROUNDS);

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

  const passwordOk = await bcrypt.compare(password, usuario?.passwordHash ?? DUMMY_HASH);

  // Mismo mensaje para todos los casos, no se revela cuál falló
  if (!gimnasio || !usuario || !usuario.activo || !passwordOk) {
    throw new AppError(401, "Credenciales inválidas");
  }

  return buildSession(usuario, gimnasio);
}
