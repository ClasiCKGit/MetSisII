import { Router } from "express";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as usuariosController from "./usuarios.controller";
import {
  actualizarUsuarioSchema,
  crearUsuarioSchema,
  resetPasswordSchema,
} from "./usuarios.schema";

export const usuariosRouter = Router();

// Toda la gestión de usuarios es solo para administradores
usuariosRouter.use(authenticate, requireRole("ADMIN"));

usuariosRouter.get("/", usuariosController.listar);
usuariosRouter.post("/", validateBody(crearUsuarioSchema), usuariosController.crear);
usuariosRouter.patch("/:id", validateBody(actualizarUsuarioSchema), usuariosController.actualizar);
usuariosRouter.post(
  "/:id/reset-password",
  validateBody(resetPasswordSchema),
  usuariosController.resetearPassword
);
