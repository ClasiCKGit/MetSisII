import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import {
  conToken,
  crearActividad,
  crearEscenario,
  crearTipoMembresia,
  crearUsuario,
  tokenDe,
} from "../helpers/factories";

const app = createApp();

describe("acceso a /api/tipos-membresia", () => {
  it("exige sesión", async () => {
    const res = await request(app).get("/api/tipos-membresia");
    expect(res.status).toBe(401);
  });

  it("un recepcionista puede consultar, pero no crear, modificar ni dar de baja (403)", async () => {
    const { a } = await crearEscenario();
    const recepcion = await crearUsuario(a.gimnasio.id);
    const token = conToken(tokenDe(recepcion));
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);

    const lectura = await request(app).get("/api/tipos-membresia").set(token);
    expect(lectura.status).toBe(200);

    const respuestas = await Promise.all([
      request(app)
        .post("/api/tipos-membresia")
        .set(token)
        .send({ actividadId: actividad.id, nombre: "Mensual", precio: 100, duracionDias: 30 }),
      request(app).patch(`/api/tipos-membresia/${tipo.id}`).set(token).send({ nombre: "X" }),
      request(app).delete(`/api/tipos-membresia/${tipo.id}`).set(token),
    ]);
    expect(respuestas.map((r) => r.status)).toEqual([403, 403, 403]);

    const intacto = await prisma.tipoMembresia.findUniqueOrThrow({ where: { id: tipo.id } });
    expect(intacto).toMatchObject({ nombre: tipo.nombre, activo: true });
    expect(await prisma.tipoMembresia.count()).toBe(1);
  });
});

describe("GET /api/tipos-membresia", () => {
  it("lista solo los tipos del propio gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const actividadA = await crearActividad(a.gimnasio.id);
    const actividadB = await crearActividad(b.gimnasio.id);
    const propio = await crearTipoMembresia(a.gimnasio.id, actividadA.id);
    await crearTipoMembresia(b.gimnasio.id, actividadB.id);

    const res = await request(app).get("/api/tipos-membresia").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((x: { id: string }) => x.id)).toEqual([propio.id]);
    expect(res.body[0].actividad).toEqual({ id: actividadA.id, nombre: actividadA.nombre });
  });

  it("filtra por actividad", async () => {
    const { a } = await crearEscenario();
    const yoga = await crearActividad(a.gimnasio.id, { nombre: "Yoga" });
    const boxeo = await crearActividad(a.gimnasio.id, { nombre: "Boxeo" });
    const deYoga = await crearTipoMembresia(a.gimnasio.id, yoga.id);
    await crearTipoMembresia(a.gimnasio.id, boxeo.id);

    const res = await request(app)
      .get("/api/tipos-membresia")
      .query({ actividadId: yoga.id })
      .set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((x: { id: string }) => x.id)).toEqual([deYoga.id]);
  });

  it("responde 400 si el filtro de actividad no es un id válido", async () => {
    const { a } = await crearEscenario();

    const res = await request(app)
      .get("/api/tipos-membresia")
      .query({ actividadId: "no-es-un-id" })
      .set(conToken(a.token));

    expect(res.status).toBe(400);
  });
});

describe("GET /api/tipos-membresia/:id", () => {
  it("devuelve el tipo con su actividad", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id, { precio: "8000" });

    const res = await request(app).get(`/api/tipos-membresia/${tipo.id}`).set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: tipo.id,
      precio: "8000",
      actividad: { id: actividad.id },
    });
  });

  it("responde 400 con un id inválido", async () => {
    const { a } = await crearEscenario();

    const res = await request(app).get("/api/tipos-membresia/no-es-un-id").set(conToken(a.token));
    expect(res.status).toBe(400);
  });

  it("responde 404 para un tipo de otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);
    const tipo = await crearTipoMembresia(b.gimnasio.id, ajena.id);

    const res = await request(app).get(`/api/tipos-membresia/${tipo.id}`).set(conToken(a.token));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tipos-membresia", () => {
  it("crea el tipo en el gimnasio de la sesión", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    const res = await request(app).post("/api/tipos-membresia").set(conToken(a.token)).send({
      actividadId: actividad.id,
      nombre: "Mensual",
      precio: 15000.5,
      duracionDias: 30,
      cantidadClases: 12,
    });

    expect(res.status).toBe(201);
    const guardado = await prisma.tipoMembresia.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardado).toMatchObject({
      gimnasioId: a.gimnasio.id,
      actividadId: actividad.id,
      nombre: "Mensual",
      duracionDias: 30,
      cantidadClases: 12,
      activo: true,
    });
    expect(guardado.precio.toFixed(2)).toBe("15000.50");
  });

  it.each([
    ["sin nombre", { nombre: "" }],
    ["con precio negativo", { precio: -1 }],
    ["con más de 2 decimales en el precio", { precio: 10.123 }],
    ["con un precio que no entra en la columna", { precio: 100_000_000 }],
    ["con duración cero", { duracionDias: 0 }],
  ])("responde 400 %s y no crea nada", async (_caso, cambio) => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    const res = await request(app)
      .post("/api/tipos-membresia")
      .set(conToken(a.token))
      .send({
        actividadId: actividad.id,
        nombre: "Mensual",
        precio: 100,
        duracionDias: 30,
        ...cambio,
      });

    expect(res.status).toBe(400);
    expect(await prisma.tipoMembresia.count()).toBe(0);
  });

  it("responde 404 si la actividad es de otro gimnasio y no crea nada", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);

    const res = await request(app)
      .post("/api/tipos-membresia")
      .set(conToken(a.token))
      .send({ actividadId: ajena.id, nombre: "Mensual", precio: 100, duracionDias: 30 });

    expect(res.status).toBe(404);
    expect(await prisma.tipoMembresia.count()).toBe(0);
  });
});

describe("PATCH /api/tipos-membresia/:id", () => {
  it("actualiza los campos enviados", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);

    const res = await request(app)
      .patch(`/api/tipos-membresia/${tipo.id}`)
      .set(conToken(a.token))
      .send({ nombre: "Trimestral", precio: "40000", duracionDias: 90 });

    expect(res.status).toBe(200);
    const guardado = await prisma.tipoMembresia.findUniqueOrThrow({ where: { id: tipo.id } });
    expect(guardado).toMatchObject({ nombre: "Trimestral", duracionDias: 90 });
    expect(guardado.precio.toFixed(2)).toBe("40000.00");
  });

  it("responde 400 con el cuerpo vacío y no modifica nada", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);

    const res = await request(app)
      .patch(`/api/tipos-membresia/${tipo.id}`)
      .set(conToken(a.token))
      .send({});

    expect(res.status).toBe(400);
    const intacto = await prisma.tipoMembresia.findUniqueOrThrow({ where: { id: tipo.id } });
    expect(intacto.updatedAt).toEqual(tipo.updatedAt);
  });

  it("responde 404 si se lo pasa a una actividad de otro gimnasio y no lo modifica", async () => {
    const { a, b } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const ajena = await crearActividad(b.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);

    const res = await request(app)
      .patch(`/api/tipos-membresia/${tipo.id}`)
      .set(conToken(a.token))
      .send({ actividadId: ajena.id });

    expect(res.status).toBe(404);
    const intacto = await prisma.tipoMembresia.findUniqueOrThrow({ where: { id: tipo.id } });
    expect(intacto.actividadId).toBe(actividad.id);
  });

  it("responde 404 para un tipo de otro gimnasio y no lo modifica", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);
    const tipo = await crearTipoMembresia(b.gimnasio.id, ajena.id);

    const res = await request(app)
      .patch(`/api/tipos-membresia/${tipo.id}`)
      .set(conToken(a.token))
      .send({ nombre: "Hackeado" });

    expect(res.status).toBe(404);
    const intacto = await prisma.tipoMembresia.findUniqueOrThrow({ where: { id: tipo.id } });
    expect(intacto.nombre).toBe(tipo.nombre);
  });
});

describe("DELETE /api/tipos-membresia/:id", () => {
  it("da de baja el tipo sin borrar el registro", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);

    const res = await request(app).delete(`/api/tipos-membresia/${tipo.id}`).set(conToken(a.token));

    expect(res.status).toBe(200);
    const guardado = await prisma.tipoMembresia.findUniqueOrThrow({ where: { id: tipo.id } });
    expect(guardado.activo).toBe(false);
  });

  it("responde 404 para un tipo de otro gimnasio y no lo da de baja", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);
    const tipo = await crearTipoMembresia(b.gimnasio.id, ajena.id);

    const res = await request(app).delete(`/api/tipos-membresia/${tipo.id}`).set(conToken(a.token));

    expect(res.status).toBe(404);
    const intacto = await prisma.tipoMembresia.findUniqueOrThrow({ where: { id: tipo.id } });
    expect(intacto.activo).toBe(true);
  });
});
