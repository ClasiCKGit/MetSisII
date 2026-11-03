import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";

const app = createApp();

describe("app base", () => {
  it("GET /health responde ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("una ruta inexistente responde 404 en JSON", async () => {
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Ruta no encontrada/);
  });

  it("un JSON mal formado responde 400 (error del cliente), sin detalles internos", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{esto no es json");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "El cuerpo de la solicitud no es un JSON válido" });
  });

  it("un cuerpo demasiado grande responde 413", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ gimnasioSlug: "x", email: "a@b.com", password: "a".repeat(200_000) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "La solicitud es demasiado grande" });
  });

  it("envía los headers de seguridad de helmet", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
