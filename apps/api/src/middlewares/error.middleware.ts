// apps/api/src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Error de validación",
      details: z.treeifyError(err),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  req.log?.error(err);

  const isDev = process.env.NODE_ENV !== "production";
  return res.status(500).json({
    error: "Error interno del servidor",
    ...(isDev && err instanceof Error ? { detail: err.message, stack: err.stack } : {}),
  });
}
