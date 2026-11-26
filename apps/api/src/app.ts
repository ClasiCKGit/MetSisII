import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env, origenesPermitidos } from "./config/env";
import { logger } from "./config/logger";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { tiposMembresiaRouter } from "./modules/tipos-membresia/tipo-membresia.routes";
import { membresiasRouter } from "./modules/membresias/membresia.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";
import { profesoresRouter } from "./modules/profesores/profesores.routes";
import { actividadesRouter } from "./modules/actividades/actividades.routes";
import { horariosRouter } from "./modules/horarios/horarios.routes";
import { sociosRouter } from "./modules/socios/socios.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { pagosRouter } from "./modules/pagos/pagos.routes";

export function createApp() {
  const app = express();

  // Cuántos saltos de X-Forwarded-For creer para calcular req.ip (lo usa authLimiter)
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
  // Un origen no permitido no recibe Access-Control-Allow-Origin y el navegador corta la respuesta
  app.use(cors({ origin: origenesPermitidos(env) }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/tipos-membresia", tiposMembresiaRouter);
  app.use("/api/membresias", membresiasRouter);
  app.use("/api/usuarios", usuariosRouter);
  app.use("/api/socios", sociosRouter);
  app.use("/api/profesores", profesoresRouter);
  app.use("/api/actividades", actividadesRouter);
  app.use("/api/horarios", horariosRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/pagos", pagosRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
