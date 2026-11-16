import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { conToken, crearEscenario, crearSocio, crearUsuario, tokenDe } from "../helpers/factories";

const app = createApp();

describe("GET /api/dashboard/resumen", () => {
  it("exige sesión", async () => {
    const res = await request(app).get("/api/dashboard/resumen");
    expect(res.status).toBe(401);
  });

  it("lo ven tanto los administradores como la recepción", async () => {
    const { a } = await crearEscenario();
    const recepcion = await crearUsuario(a.gimnasio.id);

    const respuestas = await Promise.all([
      request(app).get("/api/dashboard/resumen").set(conToken(a.token)),
      request(app)
        .get("/api/dashboard/resumen")
        .set(conToken(tokenDe(recepcion))),
    ]);
    expect(respuestas.map((r) => r.status)).toEqual([200, 200]);
  });

  it("cuenta solo los socios activos del propio gimnasio", async () => {
    const { a, b } = await crearEscenario();
    await crearSocio(a.gimnasio.id);
    await crearSocio(a.gimnasio.id);
    await crearSocio(a.gimnasio.id, { activo: false });
    await crearSocio(b.gimnasio.id);

    const [deA, deB] = await Promise.all([
      request(app).get("/api/dashboard/resumen").set(conToken(a.token)),
      request(app).get("/api/dashboard/resumen").set(conToken(b.token)),
    ]);

    expect(deA.body).toEqual({ sociosActivos: 2 });
    expect(deB.body).toEqual({ sociosActivos: 1 });
  });

  it("devuelve 0 si el gimnasio todavía no tiene socios", async () => {
    const { a } = await crearEscenario();

    const res = await request(app).get("/api/dashboard/resumen").set(conToken(a.token));

    expect(res.body).toEqual({ sociosActivos: 0 });
  });
});
