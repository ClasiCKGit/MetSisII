import type { Request, Response } from "express";
import { listarMembresiasQuerySchema, membresiaIdParamSchema } from "./membresia.schema";
import * as service from "./membresia.service";

export async function listar(req: Request, res: Response) {
  const filtros = listarMembresiasQuerySchema.parse(req.query);
  res.json(await service.listar(req.db, filtros));
}

export async function obtener(req: Request, res: Response) {
  const { id } = membresiaIdParamSchema.parse(req.params);
  res.json(await service.obtener(req.db, id));
}

export async function inscribir(req: Request, res: Response) {
  res.status(201).json(await service.inscribir(req.db, req.body));
}
