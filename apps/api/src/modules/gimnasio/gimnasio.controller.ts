import type { Request, Response } from "express";
import * as gimnasioService from "./gimnasio.service";

export async function obtener(req: Request, res: Response) {
  res.json(await gimnasioService.obtener(req.db, req.auth));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await gimnasioService.actualizar(req.db, req.auth, req.body));
}
