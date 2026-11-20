import type { Request, Response } from "express";
import * as service from "./membresia.service";

export async function inscribir(req: Request, res: Response) {
  res.status(201).json(await service.inscribir(req.db, req.body));
}
