import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as controller from "./membresia.controller";
import { inscribirSocioSchema } from "./membresia.schema";

export const membresiasRouter = Router();

membresiasRouter.use(authenticate);
membresiasRouter.get("/", controller.listar);
membresiasRouter.get("/:id", controller.obtener);
membresiasRouter.post(
  "/inscripciones",
  requireRole("ADMIN", "RECEPCIONISTA"),
  validateBody(inscribirSocioSchema),
  controller.inscribir
);
