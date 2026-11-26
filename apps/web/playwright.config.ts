import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { API_PORT, API_URL, WEB_PORT, WEB_URL } from "./tests-e2e/urls.ts";

// Pruebas de punta a punta (tests-e2e/): un navegador real contra el build de producción de la
// web (vite preview) y la API real sobre la base de tests. Detalle en docs/frontend/testing-e2e.md

// La misma base que usan los tests de la API: DATABASE_URL de apps/api/.env con sufijo "_test".
// En CI se define TEST_DATABASE_URL. Se lee el .env sin cargarlo en process.env, para no pasarle
// a la API las variables de desarrollo.
function urlDeLaBaseDeTests(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const envDeLaApi = path.resolve(import.meta.dirname, "../api/.env");
  const base = existsSync(envDeLaApi) ? parse(readFileSync(envDeLaApi)).DATABASE_URL : undefined;
  if (!base) throw new Error("Falta DATABASE_URL en apps/api/.env (o definí TEST_DATABASE_URL).");
  const url = new URL(base);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}

const DATABASE_URL = urlDeLaBaseDeTests();
// Misma red de seguridad que los tests de la API: nunca contra una base que no sea de tests
if (!/_test$/.test(new URL(DATABASE_URL).pathname)) {
  throw new Error(`Las pruebas e2e solo corren contra una base terminada en "_test".`);
}

export default defineConfig({
  testDir: "./tests-e2e",
  // Recorridos completos contra una API que corre con tsx: en la primera corrida (build recién
  // hecho, API recién levantada, varios tests en paralelo) los 30 s por defecto quedaban justos
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Cada test crea su propio gimnasio: pueden correr en paralelo sin pisarse
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    // Si un test falla, queda la traza (pantallas, red, consola) para verla con show-trace
    trace: "retain-on-failure",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // API real: aplica las migraciones pendientes a la base de tests y arranca
      command: "npx prisma migrate deploy && npx tsx src/server.ts",
      cwd: path.resolve(import.meta.dirname, "../api"),
      url: `${API_URL}/health`,
      env: {
        DATABASE_URL,
        NODE_ENV: "test",
        PORT: String(API_PORT),
        FRONTEND_URL: WEB_URL,
        JWT_SECRET: "secreto-solo-para-pruebas-e2e",
        // Valores falsos: estas pruebas no mandan mails
        RESEND_API_KEY: "re_test_dummy",
        MAIL_FROM: "FitManager <onboarding@resend.dev>",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Build de producción: así se prueba también la carga diferida de las pantallas
      command: `npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      env: { VITE_API_URL: API_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
