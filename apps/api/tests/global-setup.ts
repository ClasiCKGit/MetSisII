import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { Client } from "pg";
import { assertTestDatabase, TEST_DATABASE_URL } from "./test-env";

// Directorio de apps/api: Prisma 7 busca prisma.config.ts en el directorio actual
const API_DIR = resolve(__dirname, "..");

async function crearBaseSiNoExiste(connectionString: string): Promise<void> {
  const nombre = new URL(connectionString).pathname.slice(1);

  // Se conecta a la base de mantenimiento "postgres" para poder crear la de tests
  const mantenimiento = new URL(connectionString);
  mantenimiento.pathname = "/postgres";
  mantenimiento.search = "";

  const client = new Client({ connectionString: mantenimiento.toString() });
  await client.connect();
  try {
    const existe = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [nombre]);
    if (existe.rowCount === 0) {
      // CREATE DATABASE no admite parámetros; el nombre ya fue validado por assertTestDatabase
      await client.query(`CREATE DATABASE "${nombre}"`);
    }
  } finally {
    await client.end();
  }
}

export default async function setup(): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL);
  await crearBaseSiNoExiste(TEST_DATABASE_URL);

  // Aplica las migraciones versionadas del proyecto sobre la base de tests
  execSync("npx prisma migrate deploy", {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
