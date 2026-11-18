import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as controller from "./tipo-membresia.controller";
import { actualizarTipoMembresiaSchema, crearTipoMembresiaSchema } from "./tipo-membresia.schema";

export const tiposMembresiaRouter = Router();

tiposMembresiaRouter.use(authenticate);
tiposMembresiaRouter.get("/", controller.listar);
tiposMembresiaRouter.get("/:id", controller.obtener);
tiposMembresiaRouter.post(
  "/",
  requireRole("ADMIN"),
  validateBody(crearTipoMembresiaSchema),
  controller.crear
);
tiposMembresiaRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validateBody(actualizarTipoMembresiaSchema),
  controller.actualizar
);
tiposMembresiaRouter.delete("/:id", requireRole("ADMIN"), controller.eliminar);
