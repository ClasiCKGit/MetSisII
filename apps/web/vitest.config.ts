import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      // Un origen distinto del de la API, como en desarrollo (5173 -> 3000)
      environmentOptions: { jsdom: { url: "http://localhost:5173" } },
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      env: {
        VITE_API_URL: process.env.VITE_API_URL ?? "http://localhost:3000",
        // "real" = sin API falsa, contra la API verdadera (ver tests/helpers/modo.ts)
        VITE_TEST_API: process.env.TEST_API ?? "fake",
      },
      testTimeout: 15_000,
    },
  })
);
