import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { tiposMembresiaRouter } from "./modules/tipos-membresia/tipo-membresia.routes";
import { membresiasRouter } from "./modules/membresias/membresia.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors()); // TODO: restringir origin al dominio del frontend cuando definamos deploy
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/tipos-membresia", tiposMembresiaRouter);
  app.use("/api/membresias", membresiasRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
