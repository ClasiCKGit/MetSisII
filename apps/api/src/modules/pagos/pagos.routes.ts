import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as controller from "./pagos.controller";
import { actualizarEstadoPagoSchema, crearPagoSchema } from "./pagos.schema";

export const pagosRouter = Router();

pagosRouter.use(authenticate);
pagosRouter.get("/", controller.listar);
pagosRouter.get("/:id", controller.obtener);
pagosRouter.post(
  "/",
  requireRole("ADMIN", "RECEPCIONISTA"),
  validateBody(crearPagoSchema),
  controller.crear
);
pagosRouter.patch(
  "/:id/estado",
  requireRole("ADMIN", "RECEPCIONISTA"),
  validateBody(actualizarEstadoPagoSchema),
  controller.actualizarEstado
);
