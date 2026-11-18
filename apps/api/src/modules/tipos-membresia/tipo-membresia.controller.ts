import type { Request, Response } from "express";
import * as service from "./tipo-membresia.service";

export async function listar(req: Request, res: Response) {
  res.json(
    await service.listar(
      req.db,
      typeof req.query.actividadId === "string" ? req.query.actividadId : undefined
    )
  );
}

export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(req.db, req.params.id));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await service.crear(req.db, req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await service.actualizar(req.db, req.params.id, req.body));
}

export async function eliminar(req: Request, res: Response) {
  res.json(await service.eliminar(req.db, req.params.id));
}
