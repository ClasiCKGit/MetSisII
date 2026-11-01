import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authLimiter } from "../../middlewares/rate-limit.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as authController from "./auth.controller";
import { changePasswordSchema, loginSchema, registerGimnasioSchema } from "./auth.schema";

export const authRouter = Router();

authRouter.post(
  "/register-gimnasio",
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
