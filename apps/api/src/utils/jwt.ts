import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";

const JWT_EXPIRES_IN: SignOptions["expiresIn"] = "8h";

const payloadSchema = z.object({
  sub: z.string(),
  gid: z.string(),
});

export function signToken(data: { usuarioId: string; gimnasioId: string }): string {
  return jwt.sign({ gid: data.gimnasioId }, env.JWT_SECRET, {
    subject: data.usuarioId,
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
}

export function verifyToken(token: string): { usuarioId: string; gimnasioId: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    const payload = payloadSchema.parse(decoded);
    return { usuarioId: payload.sub, gimnasioId: payload.gid };
  } catch {
    throw new AppError(401, "Token inválido o expirado");
  }
}
