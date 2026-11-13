import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as actividadesController from "./actividades.controller";
import {
  actualizarActividadSchema,
  crearActividadSchema,
  vincularProfesorSchema,
} from "./actividades.schema";

export const actividadesRouter = Router();

// Cualquier usuario autenticado puede consultar; solo los administradores modifican
actividadesRouter.use(authenticate);

actividadesRouter.get("/", actividadesController.listar);
actividadesRouter.get("/:id", actividadesController.obtener);
actividadesRouter.post(
  "/",
  requireRole("ADMIN"),
  validateBody(crearActividadSchema),
  actividadesController.crear
);
actividadesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validateBody(actualizarActividadSchema),
  actividadesController.actualizar
);
actividadesRouter.get("/:id/profesores", actividadesController.listarProfesores);
actividadesRouter.post(
  "/:id/profesores",
  requireRole("ADMIN"),
  validateBody(vincularProfesorSchema),
  actividadesController.vincularProfesor
);
actividadesRouter.delete(
  "/:id/profesores/:profesorId",
  requireRole("ADMIN"),
  actividadesController.desvincularProfesor
);
