import "dotenv/config";

// La base de tests se deriva de la de desarrollo agregándole el sufijo "_test"
// (fitmanager_dev -> fitmanager_dev_test). En CI se define TEST_DATABASE_URL.
function derivarUrlDeTest(): string {
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error("Falta DATABASE_URL en apps/api/.env (o definí TEST_DATABASE_URL).");
  }
  const url = new URL(base);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? derivarUrlDeTest();

// Red de seguridad: los tests vacían las tablas. Nunca pueden correr contra una base
// que no sea de tests, aunque alguien configure mal las variables de entorno.
export function assertTestDatabase(connectionString: string | undefined): void {
  const nombre = connectionString ? new URL(connectionString).pathname.slice(1) : "";
  if (!/^[A-Za-z0-9_]+_test$/.test(nombre)) {
    throw new Error(
      `Los tests solo pueden correr contra una base cuyo nombre termine en "_test" ` +
        `(base recibida: "${nombre}"). Se cancela para no borrar datos reales.`
    );
  }
}
