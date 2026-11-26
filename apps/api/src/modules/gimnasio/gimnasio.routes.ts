import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as gimnasioController from "./gimnasio.controller";
import { actualizarGimnasioSchema } from "./gimnasio.schema";

// El gimnasio de la sesión: no lleva id en la ruta, siempre es el propio
export const gimnasioRouter = Router();

gimnasioRouter.use(authenticate);
gimnasioRouter.get("/", gimnasioController.obtener);
gimnasioRouter.patch(
  "/",
  requireRole("ADMIN"),
  validateBody(actualizarGimnasioSchema),
  gimnasioController.actualizar
);
