import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";

const JWT_EXPIRES_IN: SignOptions["expiresIn"] = "8h";

const payloadSchema = z.object({
  sub: z.string(),
  gid: z.string(),
  // Versión de las credenciales del usuario al emitir el token (Usuario.tokenVersion)
  ver: z.number().int().nonnegative(),
});

export interface TokenData {
  usuarioId: string;
  gimnasioId: string;
  tokenVersion: number;
}

/** Firma el JWT de la sesión. */
export function signToken(data: TokenData): string {
  return jwt.sign({ gid: data.gimnasioId, ver: data.tokenVersion }, env.JWT_SECRET, {
    subject: data.usuarioId,
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
}

/** Verifica firma, vencimiento y forma del JWT. No consulta la base. */
export function verifyToken(token: string): TokenData {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    const payload = payloadSchema.parse(decoded);
    return { usuarioId: payload.sub, gimnasioId: payload.gid, tokenVersion: payload.ver };
  } catch {
    throw new AppError(401, "Token inválido o expirado");
  }
}
