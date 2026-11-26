import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

// config/env.ts lee las variables al importarse: se recarga la app con cada valor
async function crearAppCon(variables: Record<string, string>) {
  for (const [nombre, valor] of Object.entries(variables)) vi.stubEnv(nombre, valor);
  vi.resetModules();
  const { createApp } = await import("../../src/app");
  return createApp();
}

describe("trust proxy", () => {
  it("toma la cantidad de proxies de TRUST_PROXY", async () => {
    const app = await crearAppCon({ TRUST_PROXY: "1" });
    expect(app.get("trust proxy")).toBe(1);
  });

  it("con TRUST_PROXY=0 no confía en ningún proxy", async () => {
    const app = await crearAppCon({ TRUST_PROXY: "0" });
    expect(app.get("trust proxy")).toBe(0);
  });
});
