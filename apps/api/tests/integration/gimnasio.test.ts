import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import { conToken, crearEscenario, crearUsuario, tokenDe } from "../helpers/factories";

const app = createApp();

describe("GET /api/gimnasio", () => {
  it("exige sesión", async () => {
    const res = await request(app).get("/api/gimnasio");

    expect(res.status).toBe(401);
  });

  it("devuelve los datos del propio gimnasio, también a la recepción", async () => {
    const { a } = await crearEscenario();
    await prisma.gimnasio.update({
      where: { id: a.gimnasio.id },
      data: { email: "hola@gym.com", telefono: "291 555-1234", direccion: "Alsina 100" },
    });
    const recepcionista = await crearUsuario(a.gimnasio.id, { rol: "RECEPCIONISTA" });

    const res = await request(app)
      .get("/api/gimnasio")
      .set(conToken(tokenDe(recepcionista)));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: a.gimnasio.id,
      nombre: a.gimnasio.nombre,
      slug: a.gimnasio.slug,
      email: "hola@gym.com",
      telefono: "291 555-1234",
      direccion: "Alsina 100",
    });
  });
});

describe("PATCH /api/gimnasio", () => {
  it("exige sesión", async () => {
    const res = await request(app).patch("/api/gimnasio").send({ nombre: "Otro nombre" });

    expect(res.status).toBe(401);
  });

  it("es solo para administradores", async () => {
    const { a } = await crearEscenario();
    const recepcionista = await crearUsuario(a.gimnasio.id, { rol: "RECEPCIONISTA" });

    const res = await request(app)
      .patch("/api/gimnasio")
      .set(conToken(tokenDe(recepcionista)))
      .send({ nombre: "Otro nombre" });

    expect(res.status).toBe(403);
    expect((await prisma.gimnasio.findUniqueOrThrow({ where: { id: a.gimnasio.id } })).nombre).toBe(
      a.gimnasio.nombre
    );
  });

  it("actualiza los datos enviados, recorta espacios y borra un opcional vacío", async () => {
    const { a } = await crearEscenario();
    await prisma.gimnasio.update({
      where: { id: a.gimnasio.id },
      data: { telefono: "291 555-1234" },
    });

    const res = await request(app)
      .patch("/api/gimnasio")
      .set(conToken(a.token))
      .send({ nombre: "  FitZone Centro  ", email: "Contacto@FitZone.com", telefono: "" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      nombre: "FitZone Centro",
      email: "contacto@fitzone.com",
      telefono: null,
    });
    expect(await prisma.gimnasio.findUniqueOrThrow({ where: { id: a.gimnasio.id } })).toMatchObject(
      {
        nombre: "FitZone Centro",
        email: "contacto@fitzone.com",
        telefono: null,
        slug: a.gimnasio.slug,
      }
    );
  });

  it("solo cambia el propio gimnasio", async () => {
    const { a, b } = await crearEscenario();

    await request(app).patch("/api/gimnasio").set(conToken(a.token)).send({ nombre: "Nuevo A" });

    expect((await prisma.gimnasio.findUniqueOrThrow({ where: { id: b.gimnasio.id } })).nombre).toBe(
      b.gimnasio.nombre
    );
  });

  it.each([
    [{}, "sin campos"],
    [{ slug: "otro-slug" }, "intentando cambiar el slug"],
    [{ activo: false }, "intentando darlo de baja"],
    [{ nombre: "A" }, "con un nombre demasiado corto"],
    [{ email: "no-es-un-email" }, "con un email inválido"],
    [{ telefono: "1".repeat(31) }, "con un teléfono demasiado largo"],
  ])("responde 400 %s y no cambia nada (%s)", async (body) => {
    const { a } = await crearEscenario();

    const res = await request(app).patch("/api/gimnasio").set(conToken(a.token)).send(body);

    expect(res.status).toBe(400);
    expect(await prisma.gimnasio.findUniqueOrThrow({ where: { id: a.gimnasio.id } })).toMatchObject(
      { nombre: a.gimnasio.nombre, slug: a.gimnasio.slug, activo: true }
    );
  });

  it("el nombre nuevo aparece en la sesión (GET /api/auth/me)", async () => {
    const { a } = await crearEscenario();

    await request(app).patch("/api/gimnasio").set(conToken(a.token)).send({ nombre: "Renombrado" });
    const me = await request(app).get("/api/auth/me").set(conToken(a.token));

    expect(me.body.gimnasio.nombre).toBe("Renombrado");
  });
});
