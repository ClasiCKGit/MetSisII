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

function prismaErrorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const { code } = err as { code: unknown };
    if (typeof code === "string" && /^P\d{4}$/.test(code)) return code;
  }
  return undefined;
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

  const prismaCode = prismaErrorCode(err);
  // Prisma tira el codigo "P2002" cuando se intenta insertar un valor ya existente a un campo @unique
  if (prismaCode === "P2002") {
    return res.status(409).json({ error: "Ya existe un registro con esos datos" });
  }
  // Prisma tira el codigo "P2025" cuando se intenta operar (update, delete, etc) sobre un registro que no existe
  if (prismaCode === "P2025") {
    return res.status(404).json({ error: "Registro no encontrado" });
  }

  req.log?.error(err);

  const isDev = process.env.NODE_ENV !== "production";
  return res.status(500).json({
    error: "Error interno del servidor",
    ...(isDev && err instanceof Error ? { detail: err.message, stack: err.stack } : {}),
  });
}
