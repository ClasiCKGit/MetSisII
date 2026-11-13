import type { Request, Response } from "express";
import { listSociosQuerySchema, socioIdParamSchema } from "./socios.schema";
import * as sociosService from "./socios.service";

export async function list(req: Request, res: Response) {
  const query = listSociosQuerySchema.parse(req.query);
  res.json(await sociosService.listSocios(req.db, query));
}

export async function getById(req: Request, res: Response) {
  const { id } = socioIdParamSchema.parse(req.params);
  res.json(await sociosService.getSocio(req.db, id));
}

export async function create(req: Request, res: Response) {
  const socio = await sociosService.createSocio(req.db, req.auth, req.body);
  res.status(201).json(socio);
}

export async function update(req: Request, res: Response) {
  const { id } = socioIdParamSchema.parse(req.params);
  res.json(await sociosService.updateSocio(req.db, id, req.body));
}

export async function deactivate(req: Request, res: Response) {
  const { id } = socioIdParamSchema.parse(req.params);
  res.json(await sociosService.deactivateSocio(req.db, id));
}
