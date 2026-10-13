import type { Request, Response } from "express";
import * as authService from "./auth.service";

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
