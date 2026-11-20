import { prisma } from "../../src/config/database";
import { assertTestDatabase } from "../test-env";

// Todas las tablas dependen (directa o indirectamente) de gimnasios, así que
// truncar esa tabla en cascada vacía toda la base.
export async function resetDb(): Promise<void> {
  assertTestDatabase(process.env.DATABASE_URL);
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "gimnasios" CASCADE');
}
