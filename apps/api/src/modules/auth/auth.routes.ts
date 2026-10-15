import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import * as authController from "./auth.controller";
import { loginSchema, registerGimnasioSchema } from "./auth.schema";

export const authRouter = Router();

authRouter.post(
  "/register-gimnasio",
  validateBody(registerGimnasioSchema),
  authController.registerGimnasio
);
authRouter.post("/login", validateBody(loginSchema), authController.login);
authRouter.get("/me", authenticate, authController.me);
