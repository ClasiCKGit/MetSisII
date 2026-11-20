import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as sociosController from "./socios.controller";
import { createSocioSchema, updateSocioSchema } from "./socios.schema";

export const sociosRouter = Router();

// Todas las rutas de socios exigen estar logueado
sociosRouter.use(authenticate);

sociosRouter.get("/", sociosController.list);
sociosRouter.get("/:id", sociosController.getById);
sociosRouter.post("/", validateBody(createSocioSchema), sociosController.create);
sociosRouter.patch("/:id", validateBody(updateSocioSchema), sociosController.update);
sociosRouter.delete("/:id", requireRole("ADMIN"), sociosController.deactivate);
