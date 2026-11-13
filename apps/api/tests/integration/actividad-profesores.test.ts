import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import {
  conToken,
  crearActividad,
  crearEscenario,
  crearProfesor,
  crearUsuario,
  crearVinculo,
  tokenDe,
} from "../helpers/factories";

const app = createApp();

const urlProfesores = (actividadId: string) => `/api/actividades/${actividadId}/profesores`;

describe("acceso a /api/actividades/:id/profesores", () => {
  it("exige sesión", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    const res = await request(app).get(urlProfesores(actividad.id));
    expect(res.status).toBe(401);
  });

  it("un recepcionista puede consultar, pero no vincular ni desvincular (403)", async () => {
    const { a } = await crearEscenario();
    const token = conToken(tokenDe(await crearUsuario(a.gimnasio.id)));
    const actividad = await crearActividad(a.gimnasio.id);
    const vinculado = await crearProfesor(a.gimnasio.id);
    const otro = await crearProfesor(a.gimnasio.id);
    await crearVinculo(a.gimnasio.id, actividad.id, vinculado.id);

    const lectura = await request(app).get(urlProfesores(actividad.id)).set(token);
    expect(lectura.status).toBe(200);

    const respuestas = await Promise.all([
      request(app).post(urlProfesores(actividad.id)).set(token).send({ profesorId: otro.id }),
      request(app)
        .delete(`${urlProfesores(actividad.id)}/${vinculado.id}`)
        .set(token),
    ]);
    expect(respuestas.map((r) => r.status)).toEqual([403, 403]);
    expect(await prisma.actividadProfesor.count({ where: { actividadId: actividad.id } })).toBe(1);
  });
});

describe("GET /api/actividades/:id/profesores", () => {
  it("lista los profesores de esa actividad, ordenados por apellido", async () => {
    const { a } = await crearEscenario();
    const yoga = await crearActividad(a.gimnasio.id);
    const boxeo = await crearActividad(a.gimnasio.id);
    const zamora = await crearProfesor(a.gimnasio.id, { apellido: "Zamora" });
    const alonso = await crearProfesor(a.gimnasio.id, { apellido: "Alonso" });
    await crearVinculo(a.gimnasio.id, yoga.id, zamora.id);
    await crearVinculo(a.gimnasio.id, yoga.id, alonso.id);
    await crearVinculo(a.gimnasio.id, boxeo.id, zamora.id); // de otra actividad: no debe aparecer

    const res = await request(app).get(urlProfesores(yoga.id)).set(conToken(a.token));

    expect(res.status).toBe(200);
    const apellidos = res.body.map((v: { profesor: { apellido: string } }) => v.profesor.apellido);
    expect(apellidos).toEqual(["Alonso", "Zamora"]);
  });

  it("responde 404 para una actividad de otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);

    const res = await request(app).get(urlProfesores(ajena.id)).set(conToken(a.token));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/actividades/:id/profesores", () => {
  const vincular = (token: string, actividadId: string, cuerpo: object) =>
    request(app).post(urlProfesores(actividadId)).set(conToken(token)).send(cuerpo);

  it("vincula al profesor con la actividad, dentro del gimnasio del administrador", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);

    const res = await vincular(a.token, actividad.id, { profesorId: profesor.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      actividadId: actividad.id,
      profesorId: profesor.id,
      gimnasioId: a.gimnasio.id,
    });
    expect(res.body.profesor.id).toBe(profesor.id);
  });

  it("responde 404 con un profesor de otro gimnasio y no crea el vínculo", async () => {
    const { a, b } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const ajeno = await crearProfesor(b.gimnasio.id);

    const res = await vincular(a.token, actividad.id, { profesorId: ajeno.id });

    expect(res.status).toBe(404);
    expect(await prisma.actividadProfesor.count({ where: { actividadId: actividad.id } })).toBe(0);
  });

  it("responde 404 con una actividad de otro gimnasio y no crea el vínculo", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);

    const res = await vincular(a.token, ajena.id, { profesorId: profesor.id });

    expect(res.status).toBe(404);
    expect(await prisma.actividadProfesor.count({ where: { actividadId: ajena.id } })).toBe(0);
  });

  it("responde 404 con un profesor que no existe", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    const res = await vincular(a.token, actividad.id, { profesorId: randomUUID() });
    expect(res.status).toBe(404);
  });

  it("responde 409 si el profesor ya estaba asignado a la actividad", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);
    await crearVinculo(a.gimnasio.id, actividad.id, profesor.id);

    const res = await vincular(a.token, actividad.id, { profesorId: profesor.id });

    expect(res.status).toBe(409);
    expect(await prisma.actividadProfesor.count({ where: { actividadId: actividad.id } })).toBe(1);
  });

  it("responde 409 con un profesor dado de baja", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const dadoDeBaja = await crearProfesor(a.gimnasio.id, { activo: false });

    const res = await vincular(a.token, actividad.id, { profesorId: dadoDeBaja.id });

    expect(res.status).toBe(409);
    expect(await prisma.actividadProfesor.count({ where: { actividadId: actividad.id } })).toBe(0);
  });

  it("responde 409 con una actividad dada de baja", async () => {
    const { a } = await crearEscenario();
    const dadaDeBaja = await crearActividad(a.gimnasio.id, { activa: false });
    const profesor = await crearProfesor(a.gimnasio.id);

    const res = await vincular(a.token, dadaDeBaja.id, { profesorId: profesor.id });

    expect(res.status).toBe(409);
    expect(await prisma.actividadProfesor.count({ where: { actividadId: dadaDeBaja.id } })).toBe(0);
  });

  it("rechaza con 400: sin profesorId o con un id que no es un UUID", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    expect((await vincular(a.token, actividad.id, {})).status).toBe(400);
    expect((await vincular(a.token, actividad.id, { profesorId: "abc" })).status).toBe(400);
  });

  it("un mismo profesor puede dar varias actividades", async () => {
    const { a } = await crearEscenario();
    const yoga = await crearActividad(a.gimnasio.id);
    const boxeo = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);

    expect((await vincular(a.token, yoga.id, { profesorId: profesor.id })).status).toBe(201);
    expect((await vincular(a.token, boxeo.id, { profesorId: profesor.id })).status).toBe(201);
  });
});

describe("DELETE /api/actividades/:id/profesores/:profesorId", () => {
  const desvincular = (token: string, actividadId: string, profesorId: string) =>
    request(app)
      .delete(`${urlProfesores(actividadId)}/${profesorId}`)
      .set(conToken(token));

  it("desvincula al profesor y responde 204", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);
    await crearVinculo(a.gimnasio.id, actividad.id, profesor.id);

    const res = await desvincular(a.token, actividad.id, profesor.id);

    expect(res.status).toBe(204);
    expect(await prisma.actividadProfesor.count({ where: { actividadId: actividad.id } })).toBe(0);
  });

  it("responde 404 si el profesor no estaba asignado a la actividad", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);

    const res = await desvincular(a.token, actividad.id, profesor.id);
    expect(res.status).toBe(404);
  });

  it("responde 404 para una actividad de otro gimnasio y no borra el vínculo", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);
    const profesorAjeno = await crearProfesor(b.gimnasio.id);
    await crearVinculo(b.gimnasio.id, ajena.id, profesorAjeno.id);

    const res = await desvincular(a.token, ajena.id, profesorAjeno.id);

    expect(res.status).toBe(404);
    expect(await prisma.actividadProfesor.count({ where: { actividadId: ajena.id } })).toBe(1);
  });

  it("los horarios que usaban el vínculo no se borran: quedan sin profesor", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);
    const vinculo = await crearVinculo(a.gimnasio.id, actividad.id, profesor.id);
    const horario = await prisma.horario.create({
      data: {
        gimnasioId: a.gimnasio.id,
        actividadId: actividad.id,
        actividadProfesorId: vinculo.id,
        diaSemana: "LUNES",
        horaInicio: "18:00",
        horaFin: "19:00",
      },
    });

    const res = await desvincular(a.token, actividad.id, profesor.id);

    expect(res.status).toBe(204);
    const intacto = await prisma.horario.findUniqueOrThrow({ where: { id: horario.id } });
    expect(intacto.actividadProfesorId).toBeNull();
  });
});
