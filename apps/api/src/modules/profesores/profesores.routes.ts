import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as profesoresController from "./profesores.controller";
import { actualizarProfesorSchema, crearProfesorSchema } from "./profesores.schema";

export const profesoresRouter = Router();

// Cualquier usuario autenticado puede consultar; solo los administradores modifican
profesoresRouter.use(authenticate);

profesoresRouter.get("/", profesoresController.listar);
profesoresRouter.get("/:id", profesoresController.obtener);
profesoresRouter.post(
  "/",
  requireRole("ADMIN"),
  validateBody(crearProfesorSchema),
  profesoresController.crear
);
profesoresRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validateBody(actualizarProfesorSchema),
  profesoresController.actualizar
);
