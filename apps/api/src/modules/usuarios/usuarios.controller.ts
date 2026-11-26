import type { Request, Response } from "express";
import { idParamsSchema } from "./usuarios.schema";
import * as usuariosService from "./usuarios.service";

export async function listar(req: Request, res: Response) {
  res.json(await usuariosService.listar(req.db));
}

export async function crear(req: Request, res: Response) {
  const usuario = await usuariosService.crear(req.db, req.auth, req.body);
  res.status(201).json(usuario);
}

export async function actualizar(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await usuariosService.actualizar(req.db, req.auth, id, req.body));
}

export async function resetearPassword(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  await usuariosService.resetearPassword(req.db, req.auth, id, req.body.password);
  res.status(204).send();
}
