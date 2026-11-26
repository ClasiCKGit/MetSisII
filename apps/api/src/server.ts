// apps/api/src/server.ts
import type { Server } from "node:http";
import "./config/env"; // valida env vars al arrancar, antes que cualquier otra cosa
import { env } from "./config/env";
import { logger } from "./config/logger";
import { createApp } from "./app";
import { prisma } from "./config/database";
import { programarRecordatorioVencimiento } from "./jobs/recordatorio-vencimiento.job";

const app = createApp();
let server: Server | undefined;

// Si las requests en curso no terminan en este tiempo, se corta igual
const ESPERA_MAXIMA_CIERRE_MS = 10_000;

async function start() {
  try {
    await prisma.$connect();
    logger.info("Conectado a la base de datos");
    programarRecordatorioVencimiento();

    server = app.listen(env.PORT, () => {
      logger.info(`API corriendo en http://localhost:${env.PORT}`);
    });
  } catch (err) {
    logger.error(err, "Error al iniciar el servidor");
    process.exit(1);
  }
}

// En Docker y en el hosting, cada deploy manda SIGTERM: se dejan de aceptar conexiones,
// se terminan las requests en curso y recién ahí se cierra la base.
async function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "Cerrando servidor...");
  setTimeout(() => {
    logger.error("Las requests en curso no terminaron a tiempo: se corta el proceso");
    process.exit(1);
  }, ESPERA_MAXIMA_CIERRE_MS).unref();

  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start();
