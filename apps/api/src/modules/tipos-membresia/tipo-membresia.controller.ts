import type { Request, Response } from "express";
import {
  listarTiposMembresiaQuerySchema,
  tipoMembresiaIdParamsSchema,
} from "./tipo-membresia.schema";
import * as service from "./tipo-membresia.service";

export async function listar(req: Request, res: Response) {
  const { actividadId } = listarTiposMembresiaQuerySchema.parse(req.query);
  res.json(await service.listar(req.db, actividadId));
}

export async function obtener(req: Request, res: Response) {
  const { id } = tipoMembresiaIdParamsSchema.parse(req.params);
  res.json(await service.obtener(req.db, id));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await service.crear(req.db, req.body));
}

export async function actualizar(req: Request, res: Response) {
  const { id } = tipoMembresiaIdParamsSchema.parse(req.params);
  res.json(await service.actualizar(req.db, id, req.body));
}

export async function eliminar(req: Request, res: Response) {
  const { id } = tipoMembresiaIdParamsSchema.parse(req.params);
  res.json(await service.eliminar(req.db, id));
}
