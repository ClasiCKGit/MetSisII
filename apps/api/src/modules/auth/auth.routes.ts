import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authLimiter } from "../../middlewares/rate-limit.middleware";
import { requireRegistroHabilitado } from "../../middlewares/registro.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as authController from "./auth.controller";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerGimnasioSchema,
  resetPasswordSchema,
} from "./auth.schema";

export const authRouter = Router();

authRouter.get("/config", authController.config);
authRouter.post(
  "/register-gimnasio",
  requireRegistroHabilitado,
  authLimiter,
  validateBody(registerGimnasioSchema),
  authController.registerGimnasio
);
authRouter.post("/login", authLimiter, validateBody(loginSchema), authController.login);
authRouter.get("/me", authenticate, authController.me);
authRouter.post(
  "/change-password",
  authLimiter,
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);
authRouter.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
authRouter.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);
