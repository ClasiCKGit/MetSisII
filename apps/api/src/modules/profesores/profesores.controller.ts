import type { Request, Response } from "express";
import { idParamsSchema } from "./profesores.schema";
import * as profesoresService from "./profesores.service";

export async function listar(req: Request, res: Response) {
  res.json(await profesoresService.listar(req.db));
}

export async function obtener(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await profesoresService.obtener(req.db, id));
}

export async function crear(req: Request, res: Response) {
  const profesor = await profesoresService.crear(req.db, req.auth, req.body);
  res.status(201).json(profesor);
}

export async function actualizar(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await profesoresService.actualizar(req.db, id, req.body));
}
