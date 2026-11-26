import type { Request, Response } from "express";
import { listarPagosQuerySchema, pagoIdParamSchema } from "./pagos.schema";
import * as pagosService from "./pagos.service";

export async function listar(req: Request, res: Response) {
  const filtros = listarPagosQuerySchema.parse(req.query);
  res.json(await pagosService.listarPagos(req.db, filtros));
}

export async function exportar(req: Request, res: Response) {
  const filtros = listarPagosQuerySchema.parse(req.query);
  const csv = await pagosService.exportarPagosCsv(req.db, filtros);
  res.attachment("pagos.csv").type("text/csv; charset=utf-8").send(csv);
}

export async function obtener(req: Request, res: Response) {
  const { id } = pagoIdParamSchema.parse(req.params);
  res.json(await pagosService.obtenerPago(req.db, id));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await pagosService.crearPago(req.db, req.body));
}

export async function actualizarEstado(req: Request, res: Response) {
  const { id } = pagoIdParamSchema.parse(req.params);
  const { estado } = req.body;
  res.json(await pagosService.actualizarEstadoPago(req.db, id, estado));
}
