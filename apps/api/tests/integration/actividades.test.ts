import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import {
  conToken,
  crearActividad,
  crearEscenario,
  crearUsuario,
  tokenDe,
} from "../helpers/factories";

const app = createApp();

describe("acceso a /api/actividades", () => {
  it("exige sesión", async () => {
    const res = await request(app).get("/api/actividades");
    expect(res.status).toBe(401);
  });

  it("un recepcionista puede consultar, pero no crear ni modificar (403)", async () => {
    const { a } = await crearEscenario();
    const recepcion = await crearUsuario(a.gimnasio.id);
    const token = conToken(tokenDe(recepcion));
    const actividad = await crearActividad(a.gimnasio.id);

    const lectura = await request(app).get("/api/actividades").set(token);
    expect(lectura.status).toBe(200);

    const respuestas = await Promise.all([
      request(app).post("/api/actividades").set(token).send({}),
      request(app).patch(`/api/actividades/${actividad.id}`).set(token).send({ nombre: "X" }),
    ]);
    expect(respuestas.map((r) => r.status)).toEqual([403, 403]);

    const intacta = await prisma.actividad.findUniqueOrThrow({ where: { id: actividad.id } });
    expect(intacta.nombre).toBe(actividad.nombre);
  });
});

describe("GET /api/actividades", () => {
  it("lista solo las actividades del propio gimnasio, ordenadas por nombre", async () => {
    const { a, b } = await crearEscenario();
    await crearActividad(a.gimnasio.id, { nombre: "Yoga" });
    await crearActividad(a.gimnasio.id, { nombre: "Boxeo" });
    await crearActividad(b.gimnasio.id, { nombre: "Ajena" });

    const res = await request(app).get("/api/actividades").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((x: { nombre: string }) => x.nombre)).toEqual(["Boxeo", "Yoga"]);
  });

  it("incluye las actividades dadas de baja", async () => {
    const { a } = await crearEscenario();
    await crearActividad(a.gimnasio.id, { activa: false });

    const res = await request(app).get("/api/actividades").set(conToken(a.token));
    expect(res.body.filter((x: { activa: boolean }) => !x.activa)).toHaveLength(1);
  });
});

describe("GET /api/actividades/:id", () => {
  it("devuelve la actividad", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    const res = await request(app).get(`/api/actividades/${actividad.id}`).set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: actividad.id, nombre: actividad.nombre });
  });

  it("responde 404 para una actividad de otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);

    const res = await request(app).get(`/api/actividades/${ajena.id}`).set(conToken(a.token));
    expect(res.status).toBe(404);
  });

  it("responde 400 si el id no es un UUID", async () => {
    const { a } = await crearEscenario();
    const res = await request(app).get("/api/actividades/abc").set(conToken(a.token));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/actividades", () => {
  const nueva = { nombre: "Crossfit", descripcion: "Alta intensidad", cupo: 20 };

  it("crea la actividad en el gimnasio del administrador", async () => {
    const { a } = await crearEscenario();

    const res = await request(app).post("/api/actividades").set(conToken(a.token)).send(nueva);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...nueva, activa: true, gimnasioId: a.gimnasio.id });
  });

  it("ignora un gimnasioId enviado en el body", async () => {
    const { a, b } = await crearEscenario();

    const res = await request(app)
      .post("/api/actividades")
      .set(conToken(a.token))
      .send({ ...nueva, gimnasioId: b.gimnasio.id });

    expect(res.status).toBe(201);
    const guardada = await prisma.actividad.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardada.gimnasioId).toBe(a.gimnasio.id);
  });

  it("recorta los espacios del nombre", async () => {
    const { a } = await crearEscenario();

    const res = await request(app)
      .post("/api/actividades")
      .set(conToken(a.token))
      .send({ nombre: "  Yoga  " });

    expect(res.body.nombre).toBe("Yoga");
  });

  it("acepta una actividad solo con nombre: descripción y cupo quedan en null", async () => {
    const { a } = await crearEscenario();

    const res = await request(app)
      .post("/api/actividades")
      .set(conToken(a.token))
      .send({ nombre: "Musculación" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ descripcion: null, cupo: null });
  });

  it("rechaza con 400: sin nombre o con el nombre vacío", async () => {
    const { a } = await crearEscenario();
    const enviar = (cuerpo: object) =>
      request(app).post("/api/actividades").set(conToken(a.token)).send(cuerpo);

    expect((await enviar({})).status).toBe(400);
    expect((await enviar({ nombre: "   " })).status).toBe(400);
  });

  it("rechaza con 400 un cupo que no sea un entero mayor a 0", async () => {
    const { a } = await crearEscenario();
    const enviar = (cupo: unknown) =>
      request(app).post("/api/actividades").set(conToken(a.token)).send({ nombre: "Yoga", cupo });

    expect((await enviar(0)).status).toBe(400);
    expect((await enviar(-5)).status).toBe(400);
    expect((await enviar(2.5)).status).toBe(400);
    expect((await enviar("20")).status).toBe(400);
  });
});

describe("PATCH /api/actividades/:id", () => {
  it("actualiza los campos indicados", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    const res = await request(app)
      .patch(`/api/actividades/${actividad.id}`)
      .set(conToken(a.token))
      .send({ nombre: "Pilates", cupo: 12 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: actividad.id, nombre: "Pilates", cupo: 12 });
  });

  it("permite quitar el cupo mandando null (sin límite)", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id, { cupo: 20 });

    const res = await request(app)
      .patch(`/api/actividades/${actividad.id}`)
      .set(conToken(a.token))
      .send({ cupo: null });

    expect(res.status).toBe(200);
    expect(res.body.cupo).toBeNull();
  });

  it("da de baja y reactiva con activa (baja lógica)", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const enviar = (activa: boolean) =>
      request(app)
        .patch(`/api/actividades/${actividad.id}`)
        .set(conToken(a.token))
        .send({ activa });

    expect((await enviar(false)).body.activa).toBe(false);
    const guardada = await prisma.actividad.findUniqueOrThrow({ where: { id: actividad.id } });
    expect(guardada.activa).toBe(false);
    expect((await enviar(true)).body.activa).toBe(true);
  });

  it("responde 404 para una actividad de otro gimnasio y no la modifica", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);

    const res = await request(app)
      .patch(`/api/actividades/${ajena.id}`)
      .set(conToken(a.token))
      .send({ nombre: "Hackeada" });

    expect(res.status).toBe(404);
    const intacta = await prisma.actividad.findUniqueOrThrow({ where: { id: ajena.id } });
    expect(intacta.nombre).toBe(ajena.nombre);
  });

  it("rechaza con 400: campos no permitidos (gimnasioId, activo) o un body vacío", async () => {
    const { a, b } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const enviar = (cuerpo: object) =>
      request(app).patch(`/api/actividades/${actividad.id}`).set(conToken(a.token)).send(cuerpo);

    expect((await enviar({ gimnasioId: b.gimnasio.id })).status).toBe(400);
    expect((await enviar({ activo: false })).status).toBe(400);
    expect((await enviar({})).status).toBe(400);
  });
});
