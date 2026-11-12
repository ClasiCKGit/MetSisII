import type { Request, Response } from "express";
import { env } from "../../config/env";
import * as authService from "./auth.service";

/** Configuración pública que el frontend necesita antes de iniciar sesión. */
export function config(_req: Request, res: Response) {
  res.json({ registroGimnasiosHabilitado: env.REGISTRO_GIMNASIOS_HABILITADO });
}

export async function registerGimnasio(req: Request, res: Response) {
  const session = await authService.registerGimnasio(req.body);
  res.status(201).json(session);
}

export async function login(req: Request, res: Response) {
  const session = await authService.login(req.body);
  res.json(session);
}

//"me" devuelve el usuario logueado a partir del token que viene en el header Authorization
export function me(req: Request, res: Response) {
  const { usuarioId, email, nombre, apellido, rol, gimnasio } = req.auth;
  res.json({ usuario: { id: usuarioId, email, nombre, apellido, rol }, gimnasio });
}

export async function changePassword(req: Request, res: Response) {
  const session = await authService.changePassword(req.db, req.auth, req.body);
  res.json(session);
}
