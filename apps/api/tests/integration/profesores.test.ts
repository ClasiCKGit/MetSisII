import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import {
  conToken,
  crearEscenario,
  crearProfesor,
  crearUsuario,
  tokenDe,
} from "../helpers/factories";

const app = createApp();

describe("acceso a /api/profesores", () => {
  it("exige sesión", async () => {
    const res = await request(app).get("/api/profesores");
    expect(res.status).toBe(401);
  });

  it("un recepcionista puede consultar, pero no crear ni modificar (403)", async () => {
    const { a } = await crearEscenario();
    const recepcion = await crearUsuario(a.gimnasio.id);
    const token = conToken(tokenDe(recepcion));
    const profe = await crearProfesor(a.gimnasio.id);

    const lectura = await request(app).get("/api/profesores").set(token);
    expect(lectura.status).toBe(200);

    const respuestas = await Promise.all([
      request(app).post("/api/profesores").set(token).send({}),
      request(app).patch(`/api/profesores/${profe.id}`).set(token).send({ nombre: "X" }),
    ]);
    expect(respuestas.map((r) => r.status)).toEqual([403, 403]);

    const intacto = await prisma.profesor.findUniqueOrThrow({ where: { id: profe.id } });
    expect(intacto.nombre).toBe(profe.nombre);
  });
});

describe("GET /api/profesores", () => {
  it("lista solo los profesores del propio gimnasio, ordenados por apellido", async () => {
    const { a, b } = await crearEscenario();
    await crearProfesor(a.gimnasio.id, { apellido: "Zamora" });
    await crearProfesor(a.gimnasio.id, { apellido: "Alonso" });
    await crearProfesor(b.gimnasio.id, { apellido: "Ajeno" });

    const res = await request(app).get("/api/profesores").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((p: { apellido: string }) => p.apellido)).toEqual(["Alonso", "Zamora"]);
  });

  it("incluye a los profesores dados de baja", async () => {
    const { a } = await crearEscenario();
    await crearProfesor(a.gimnasio.id, { activo: false });

    const res = await request(app).get("/api/profesores").set(conToken(a.token));
    expect(res.body.filter((p: { activo: boolean }) => !p.activo)).toHaveLength(1);
  });
});

describe("GET /api/profesores/:id", () => {
  it("devuelve el profesor", async () => {
    const { a } = await crearEscenario();
    const profe = await crearProfesor(a.gimnasio.id);

    const res = await request(app).get(`/api/profesores/${profe.id}`).set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: profe.id, apellido: profe.apellido });
  });

  it("responde 404 para un profesor de otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const ajeno = await crearProfesor(b.gimnasio.id);

    const res = await request(app).get(`/api/profesores/${ajeno.id}`).set(conToken(a.token));
    expect(res.status).toBe(404);
  });

  it("responde 400 si el id no es un UUID", async () => {
    const { a } = await crearEscenario();
    const res = await request(app).get("/api/profesores/abc").set(conToken(a.token));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/profesores", () => {
  const nuevo = { nombre: "Marina", apellido: "Silva", especialidad: "Jiu-Jitsu" };

  it("crea el profesor en el gimnasio del administrador", async () => {
    const { a } = await crearEscenario();

    const res = await request(app).post("/api/profesores").set(conToken(a.token)).send(nuevo);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...nuevo, activo: true, gimnasioId: a.gimnasio.id });
  });

  it("ignora un gimnasioId enviado en el body", async () => {
    const { a, b } = await crearEscenario();

    const res = await request(app)
      .post("/api/profesores")
      .set(conToken(a.token))
      .send({ ...nuevo, gimnasioId: b.gimnasio.id });

    expect(res.status).toBe(201);
    const guardado = await prisma.profesor.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardado.gimnasioId).toBe(a.gimnasio.id);
  });

  it("recorta los espacios y normaliza el email", async () => {
    const { a } = await crearEscenario();

    const res = await request(app)
      .post("/api/profesores")
      .set(conToken(a.token))
      .send({ ...nuevo, nombre: "  Marina ", email: "  MARINA@Mail.COM " });

    expect(res.body).toMatchObject({ nombre: "Marina", email: "marina@mail.com" });
  });

  it("rechaza con 400: sin nombre ni apellido, o con un email inválido", async () => {
    const { a } = await crearEscenario();
    const enviar = (cuerpo: object) =>
      request(app).post("/api/profesores").set(conToken(a.token)).send(cuerpo);

    expect((await enviar({})).status).toBe(400);
    expect((await enviar({ nombre: "Marina" })).status).toBe(400);
    expect((await enviar({ ...nuevo, email: "no-es-un-email" })).status).toBe(400);
  });
});

describe("PATCH /api/profesores/:id", () => {
  it("actualiza los campos indicados", async () => {
    const { a } = await crearEscenario();
    const profe = await crearProfesor(a.gimnasio.id);

    const res = await request(app)
      .patch(`/api/profesores/${profe.id}`)
      .set(conToken(a.token))
      .send({ nombre: "Lucía", especialidad: "Yoga" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: profe.id, nombre: "Lucía", especialidad: "Yoga" });
  });

  it("permite borrar un campo opcional mandando null", async () => {
    const { a } = await crearEscenario();
    const profe = await prisma.profesor.create({
      data: { gimnasioId: a.gimnasio.id, nombre: "Ana", apellido: "Paz", telefono: "291-1234567" },
    });

    const res = await request(app)
      .patch(`/api/profesores/${profe.id}`)
      .set(conToken(a.token))
      .send({ telefono: null });

    expect(res.status).toBe(200);
    expect(res.body.telefono).toBeNull();
  });

  it("da de baja y reactiva con activo (baja lógica)", async () => {
    const { a } = await crearEscenario();
    const profe = await crearProfesor(a.gimnasio.id);
    const enviar = (activo: boolean) =>
      request(app).patch(`/api/profesores/${profe.id}`).set(conToken(a.token)).send({ activo });

    expect((await enviar(false)).body.activo).toBe(false);
    expect((await prisma.profesor.findUniqueOrThrow({ where: { id: profe.id } })).activo).toBe(
      false
    );
    expect((await enviar(true)).body.activo).toBe(true);
  });

  it("responde 404 para un profesor de otro gimnasio y no lo modifica", async () => {
    const { a, b } = await crearEscenario();
    const ajeno = await crearProfesor(b.gimnasio.id);

    const res = await request(app)
      .patch(`/api/profesores/${ajeno.id}`)
      .set(conToken(a.token))
      .send({ nombre: "Hackeado" });

    expect(res.status).toBe(404);
    const intacto = await prisma.profesor.findUniqueOrThrow({ where: { id: ajeno.id } });
    expect(intacto.nombre).toBe(ajeno.nombre);
  });

  it("rechaza con 400: campos no permitidos (gimnasioId) o un body vacío", async () => {
    const { a, b } = await crearEscenario();
    const profe = await crearProfesor(a.gimnasio.id);
    const enviar = (cuerpo: object) =>
      request(app).patch(`/api/profesores/${profe.id}`).set(conToken(a.token)).send(cuerpo);

    expect((await enviar({ gimnasioId: b.gimnasio.id })).status).toBe(400);
    expect((await enviar({})).status).toBe(400);
  });
});
