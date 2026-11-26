import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

// El límite se define al cargar el módulo según NODE_ENV: se recarga con cada entorno
async function appConLimitador(nodeEnv: string, trustProxy = 0) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  const { authLimiter } = await import("../../src/middlewares/rate-limit.middleware");

  const app = express();
  app.set("trust proxy", trustProxy);
  app.post("/probar", authLimiter, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("authLimiter", () => {
  it("en producción permite 20 requests y rechaza el 21º con 429", async () => {
    const app = await appConLimitador("production");

    for (let i = 1; i <= 20; i++) {
      expect((await request(app).post("/probar")).status, `request ${i}`).toBe(200);
    }

    const bloqueado = await request(app).post("/probar");
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body).toEqual({
      error: "Demasiados intentos, probá de nuevo en unos minutos",
    });
    expect(bloqueado.headers["ratelimit"] ?? bloqueado.headers["ratelimit-policy"]).toBeDefined();
  });

  it.each(["development", "test"])(
    "en %s no molesta (el límite es mucho mayor)",
    async (entorno) => {
      const app = await appConLimitador(entorno);

      for (let i = 1; i <= 50; i++) {
        expect((await request(app).post("/probar")).status).toBe(200);
      }
    }
  );

  it("detrás de un proxy cuenta por la IP real del cliente (X-Forwarded-For)", async () => {
    const app = await appConLimitador("production", 1);
    const desde = (ip: string) => request(app).post("/probar").set("X-Forwarded-For", ip);

    for (let i = 1; i <= 20; i++) {
      expect((await desde("203.0.113.1")).status, `request ${i}`).toBe(200);
    }

    expect((await desde("203.0.113.1")).status).toBe(429);
    expect((await desde("203.0.113.2")).status).toBe(200);
  });

  it("sin trust proxy ignora X-Forwarded-For: el cliente no puede esquivar el límite", async () => {
    const app = await appConLimitador("production", 0);

    for (let i = 1; i <= 20; i++) {
      await request(app).post("/probar").set("X-Forwarded-For", `203.0.113.${i}`);
    }

    const res = await request(app).post("/probar").set("X-Forwarded-For", "203.0.113.99");
    expect(res.status).toBe(429);
  });
});
