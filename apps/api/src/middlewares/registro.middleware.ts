import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "./error.middleware";

export const REGISTRO_DESHABILITADO = "El registro de gimnasios está deshabilitado";

/**
 * Corta el alta de gimnasios cuando REGISTRO_GIMNASIOS_HABILITADO es false. Va antes del
 * límite de intentos y de la validación: con el registro cerrado no hay nada que validar.
 */
export function requireRegistroHabilitado(_req: Request, _res: Response, next: NextFunction) {
  if (!env.REGISTRO_GIMNASIOS_HABILITADO) {
    throw new AppError(403, REGISTRO_DESHABILITADO);
  }
  next();
}
