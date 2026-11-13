import type { Request, Response } from "express";
import { idParamsSchema, vinculoParamsSchema } from "./actividades.schema";
import * as actividadesService from "./actividades.service";

export async function listar(req: Request, res: Response) {
  res.json(await actividadesService.listar(req.db));
}

export async function obtener(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await actividadesService.obtener(req.db, id));
}

export async function crear(req: Request, res: Response) {
  const actividad = await actividadesService.crear(req.db, req.auth, req.body);
  res.status(201).json(actividad);
}

export async function actualizar(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await actividadesService.actualizar(req.db, id, req.body));
}
export async function listarProfesores(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await actividadesService.listarProfesores(req.db, id));
}

export async function vincularProfesor(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const vinculo = await actividadesService.vincularProfesor(req.db, req.auth, id, req.body);
  res.status(201).json(vinculo);
}

export async function desvincularProfesor(req: Request, res: Response) {
  const { id, profesorId } = vinculoParamsSchema.parse(req.params);
  await actividadesService.desvincularProfesor(req.db, id, profesorId);
  res.status(204).send();
}
