import request from "supertest";
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

describe("CORS", () => {
  it("permite el origen del frontend", async () => {
    const app = await crearAppCon({ FRONTEND_URL: "http://localhost:5173", CORS_ORIGINS: "" });

    const res = await request(app).get("/health").set("Origin", "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("no habilita a un origen desconocido", async () => {
    const app = await crearAppCon({ FRONTEND_URL: "http://localhost:5173", CORS_ORIGINS: "" });

    const res = await request(app).get("/health").set("Origin", "https://sitio-malicioso.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("responde el preflight solo a los orígenes de CORS_ORIGINS", async () => {
    const app = await crearAppCon({
      CORS_ORIGINS: "https://fitmanager.com, https://www.fitmanager.com/",
    });
    const preflight = (origen: string) =>
      request(app)
        .options("/api/socios")
        .set("Origin", origen)
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "authorization,content-type");

    const permitido = await preflight("https://www.fitmanager.com");
    expect(permitido.status).toBe(204);
    expect(permitido.headers["access-control-allow-origin"]).toBe("https://www.fitmanager.com");

    const ajeno = await preflight("http://localhost:5173");
    expect(ajeno.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
