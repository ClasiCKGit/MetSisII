import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as horariosController from "./horarios.controller";
import { actualizarHorarioSchema, crearHorarioSchema } from "./horarios.schema";

export const horariosRouter = Router();

// Cualquier usuario autenticado puede consultar; solo los administradores modifican
horariosRouter.use(authenticate);

horariosRouter.get("/", horariosController.listar);
horariosRouter.get("/:id", horariosController.obtener);
horariosRouter.post(
  "/",
  requireRole("ADMIN"),
  validateBody(crearHorarioSchema),
  horariosController.crear
);
horariosRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validateBody(actualizarHorarioSchema),
  horariosController.actualizar
);
horariosRouter.delete("/:id", requireRole("ADMIN"), horariosController.eliminar);
