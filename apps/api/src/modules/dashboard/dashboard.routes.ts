import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import * as dashboardController from "./dashboard.controller";

export const dashboardRouter = Router();

// El inicio lo ven todos los usuarios con sesión, administradores y recepción
dashboardRouter.use(authenticate);

dashboardRouter.get("/resumen", dashboardController.resumen);
