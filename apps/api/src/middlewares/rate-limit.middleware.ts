import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";

// Estricto solo en producción: en desarrollo y en tests se hacen muchos intentos
// seguidos a propósito (credenciales inválidas, suites de tests).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "production" ? 20 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos, probá de nuevo en unos minutos" },
});
