import type { Request, Response } from "express";
import { idParamsSchema, listarHorariosQuerySchema } from "./horarios.schema";
import * as horariosService from "./horarios.service";

export async function listar(req: Request, res: Response) {
  const filtros = listarHorariosQuerySchema.parse(req.query);
  res.json(await horariosService.listar(req.db, filtros));
}

export async function obtener(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await horariosService.obtener(req.db, id));
}

export async function crear(req: Request, res: Response) {
  const horario = await horariosService.crear(req.db, req.auth, req.body);
  res.status(201).json(horario);
}

export async function actualizar(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await horariosService.actualizar(req.db, id, req.body));
}

export async function eliminar(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  await horariosService.eliminar(req.db, id);
  res.status(204).send();
}
