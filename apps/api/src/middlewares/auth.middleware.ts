import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { tenantClient } from "../config/tenant";
import type { Rol } from "../modules/auth/auth.types";
import { verifyToken } from "../utils/jwt";
import { AppError } from "./error.middleware";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Falta el token de autenticación");
  }

  const { usuarioId, gimnasioId } = verifyToken(header.slice("Bearer ".length));

  // Se consulta en cada request: desactivar un usuario o un gimnasio, o cambiar
  // un rol, tiene efecto inmediato sin esperar a que venza el token.
  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, gimnasioId, activo: true, gimnasio: { activo: true } },
    select: {
      id: true,
      email: true,
      nombre: true,
      apellido: true,
      rol: true,
      gimnasio: { select: { id: true, nombre: true, slug: true } },
    },
  });

  if (!usuario) {
    throw new AppError(401, "Usuario inactivo o inexistente");
  }

  req.auth = {
    usuarioId: usuario.id,
    gimnasioId,
    rol: usuario.rol,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    gimnasio: usuario.gimnasio,
  };
  req.db = tenantClient(gimnasioId);

  next();
}

export function requireRole(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.auth.rol)) {
      throw new AppError(403, "No tenés permisos para realizar esta acción");
    }
    next();
  };
}
