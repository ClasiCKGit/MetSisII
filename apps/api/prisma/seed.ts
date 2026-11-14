// Carga datos de prueba. Las funciones por entidad están en seed/entidades.ts y los datos de
// cada gimnasio en seed/gimnasios.ts.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { asegurarEntornoNoProductivo } from "./seed/guarda";
import { limpiarBase } from "./seed/entidades";
import {
  PASSWORD_ADMIN,
  PASSWORD_RECEPCION,
  sembrarFitZone,
  sembrarPowerGym,
} from "./seed/gimnasios";

async function main(prisma: PrismaClient) {
  await limpiarBase(prisma);

  const fitzone = await sembrarFitZone(prisma);
  const powergym = await sembrarPowerGym(prisma, fitzone.admin.email);

  console.log("✅ Seed completado");
  console.log(`   Gimnasio 1: ${fitzone.gimnasio.nombre} (slug: ${fitzone.gimnasio.slug})`);
  console.log(`   Admin 1: ${fitzone.admin.email} / contraseña: ${PASSWORD_ADMIN}`);
  console.log(`   Gimnasio 2: ${powergym.gimnasio.nombre} (slug: ${powergym.gimnasio.slug})`);
  console.log(`   Admin 2: ${powergym.admin.email} / contraseña: ${PASSWORD_ADMIN}`);
  console.log(
    `   Recepción 2: ${powergym.recepcion.email} / contraseña: ${PASSWORD_RECEPCION} (mismo email, otro gimnasio)`
  );
}

// La guarda va antes de crear el cliente: en producción no se llega a conectar a la base
try {
  asegurarEntornoNoProductivo();
} catch (error) {
  console.error(`❌ ${(error as Error).message}`);
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

main(prisma)
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
