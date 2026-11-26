import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    // El orden importa: env.ts fija las variables antes de que se cargue código de la API
    setupFiles: ["./tests/env.ts", "./tests/setup.ts"],
    // Todos los tests comparten una misma base de datos: los archivos corren de a uno
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
