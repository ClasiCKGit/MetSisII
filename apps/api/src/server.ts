// apps/api/src/server.ts
import "./config/env"; // valida env vars al arrancar, antes que cualquier otra cosa
import { env } from "./config/env";
import { logger } from "./config/logger";
import { createApp } from "./app";
import { prisma } from "./config/database";

const app = createApp();

async function start() {
  try {
    await prisma.$connect();
    logger.info("Conectado a la base de datos");

    app.listen(env.PORT, () => {
      logger.info(`API corriendo en http://localhost:${env.PORT}`);
    });
  } catch (err) {
    logger.error(err, "Error al iniciar el servidor");
    process.exit(1);
  }
}

async function shutdown() {
  logger.info("Cerrando servidor...");
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
