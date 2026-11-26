import type { Request, Response } from "express";
import * as dashboardService from "./dashboard.service";

export async function resumen(req: Request, res: Response) {
  res.json(await dashboardService.obtenerResumen(req.db));
}
