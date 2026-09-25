// apps/api/src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors()); // TODO: restringir origin al dominio del frontend cuando definamos deploy
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Acá se van a montar las rutas de cada módulo a medida que se implementen:
  // app.use("/api/socios", sociosRouter);
  // app.use("/api/profesores", profesoresRouter);
  // app.use("/api/actividades", actividadesRouter);
  // app.use("/api/pagos", pagosRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
