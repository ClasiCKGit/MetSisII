import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import {
  conToken,
  crearActividad,
  crearEscenario,
  crearHorario,
  crearProfesor,
  crearUsuario,
  crearVinculo,
  tokenDe,
} from "../helpers/factories";

const app = createApp();
const URL = "/api/horarios";

describe("acceso a /api/horarios", () => {
  it("exige sesión", async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  it("un recepcionista puede consultar, pero no crear, modificar ni borrar (403)", async () => {
    const { a } = await crearEscenario();
    const token = conToken(tokenDe(await crearUsuario(a.gimnasio.id)));
    const actividad = await crearActividad(a.gimnasio.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id);

    expect((await request(app).get(URL).set(token)).status).toBe(200);

    const respuestas = await Promise.all([
      request(app).post(URL).set(token).send({}),
      request(app).patch(`${URL}/${horario.id}`).set(token).send({ diaSemana: "MARTES" }),
      request(app).delete(`${URL}/${horario.id}`).set(token),
    ]);
    expect(respuestas.map((r) => r.status)).toEqual([403, 403, 403]);

    const intacto = await prisma.horario.findUniqueOrThrow({ where: { id: horario.id } });
    expect(intacto.diaSemana).toBe("LUNES");
  });
});

describe("GET /api/horarios", () => {
  it("lista solo los horarios del propio gimnasio, ordenados por día y hora", async () => {
    const { a, b } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const ajena = await crearActividad(b.gimnasio.id);
    await crearHorario(a.gimnasio.id, actividad.id, {
      diaSemana: "MIERCOLES",
      horaInicio: "10:00",
      horaFin: "11:00",
    });
    await crearHorario(a.gimnasio.id, actividad.id, {
      diaSemana: "LUNES",
      horaInicio: "18:00",
      horaFin: "19:00",
    });
    await crearHorario(a.gimnasio.id, actividad.id, {
      diaSemana: "LUNES",
      horaInicio: "09:00",
      horaFin: "10:00",
    });
    await crearHorario(b.gimnasio.id, ajena.id);

    const res = await request(app).get(URL).set(conToken(a.token));

    expect(res.status).toBe(200);
    const orden = res.body.map(
      (h: { diaSemana: string; horaInicio: string }) => `${h.diaSemana} ${h.horaInicio}`
    );
    expect(orden).toEqual(["LUNES 09:00", "LUNES 18:00", "MIERCOLES 10:00"]);
  });

  it("filtra por actividad con ?actividadId=", async () => {
    const { a } = await crearEscenario();
    const yoga = await crearActividad(a.gimnasio.id);
    const boxeo = await crearActividad(a.gimnasio.id);
    const deYoga = await crearHorario(a.gimnasio.id, yoga.id);
    await crearHorario(a.gimnasio.id, boxeo.id);

    const res = await request(app).get(`${URL}?actividadId=${yoga.id}`).set(conToken(a.token));

    expect(res.body.map((h: { id: string }) => h.id)).toEqual([deYoga.id]);
  });

  it("con la actividad de otro gimnasio devuelve una lista vacía", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);
    await crearHorario(b.gimnasio.id, ajena.id);

    const res = await request(app).get(`${URL}?actividadId=${ajena.id}`).set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("responde 400 si actividadId no es un UUID", async () => {
    const { a } = await crearEscenario();
    const res = await request(app).get(`${URL}?actividadId=abc`).set(conToken(a.token));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/horarios/:id", () => {
  it("devuelve el horario", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id);

    const res = await request(app).get(`${URL}/${horario.id}`).set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: horario.id, actividadId: actividad.id });
  });

  it("responde 404 para un horario de otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);
    const ajeno = await crearHorario(b.gimnasio.id, ajena.id);

    const res = await request(app).get(`${URL}/${ajeno.id}`).set(conToken(a.token));
    expect(res.status).toBe(404);
  });

  it("responde 400 si el id no es un UUID", async () => {
    const { a } = await crearEscenario();
    const res = await request(app).get(`${URL}/abc`).set(conToken(a.token));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/horarios", () => {
  const base = { diaSemana: "MARTES", horaInicio: "09:00", horaFin: "10:30" };

  it("crea un horario sin profesor, en el gimnasio del administrador", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: actividad.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ...base,
      actividadId: actividad.id,
      gimnasioId: a.gimnasio.id,
      actividadProfesorId: null,
    });
  });

  it("crea un horario con el profesor asignado", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);
    const vinculo = await crearVinculo(a.gimnasio.id, actividad.id, profesor.id);

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: actividad.id, actividadProfesorId: vinculo.id });

    expect(res.status).toBe(201);
    expect(res.body.actividadProfesorId).toBe(vinculo.id);
  });

  it("ignora un gimnasioId enviado en el body", async () => {
    const { a, b } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: actividad.id, gimnasioId: b.gimnasio.id });

    expect(res.status).toBe(201);
    const guardado = await prisma.horario.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardado.gimnasioId).toBe(a.gimnasio.id);
  });

  it("responde 404 con una actividad de otro gimnasio y no crea el horario", async () => {
    const { a, b } = await crearEscenario();
    const ajena = await crearActividad(b.gimnasio.id);

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: ajena.id });

    expect(res.status).toBe(404);
    expect(await prisma.horario.count({ where: { actividadId: ajena.id } })).toBe(0);
  });

  it("responde 404 con una actividad que no existe", async () => {
    const { a } = await crearEscenario();

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: randomUUID() });

    expect(res.status).toBe(404);
  });

  it("responde 404 con una asignación de profesor de otro gimnasio y no crea el horario", async () => {
    const { a, b } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const actividadAjena = await crearActividad(b.gimnasio.id);
    const profesorAjeno = await crearProfesor(b.gimnasio.id);
    const vinculoAjeno = await crearVinculo(b.gimnasio.id, actividadAjena.id, profesorAjeno.id);

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: actividad.id, actividadProfesorId: vinculoAjeno.id });

    expect(res.status).toBe(404);
    expect(await prisma.horario.count({ where: { actividadId: actividad.id } })).toBe(0);
  });

  it("responde 409 con una actividad dada de baja", async () => {
    const { a } = await crearEscenario();
    const dadaDeBaja = await crearActividad(a.gimnasio.id, { activa: false });

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: dadaDeBaja.id });

    expect(res.status).toBe(409);
    expect(await prisma.horario.count({ where: { actividadId: dadaDeBaja.id } })).toBe(0);
  });

  it("rechaza con 400: campos faltantes, día inválido o actividadId que no es un UUID", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const enviar = (cuerpo: object) => request(app).post(URL).set(conToken(a.token)).send(cuerpo);
    const valido = { ...base, actividadId: actividad.id };

    expect((await enviar({})).status).toBe(400);
    expect((await enviar({ ...valido, diaSemana: "FERIADO" })).status).toBe(400);
    expect((await enviar({ ...valido, actividadId: "abc" })).status).toBe(400);
  });

  it("rechaza con 400 una hora con formato inválido", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const enviar = (cuerpo: object) =>
      request(app)
        .post(URL)
        .set(conToken(a.token))
        .send({ ...base, actividadId: actividad.id, ...cuerpo });

    expect((await enviar({ horaInicio: "8:30" })).status).toBe(400);
    expect((await enviar({ horaFin: "25:00" })).status).toBe(400);
    expect((await enviar({ horaInicio: "08:60" })).status).toBe(400);
  });

  it("rechaza con 400 si la hora de inicio no es anterior a la de fin", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const enviar = (cuerpo: object) =>
      request(app)
        .post(URL)
        .set(conToken(a.token))
        .send({ ...base, actividadId: actividad.id, ...cuerpo });

    expect((await enviar({ horaInicio: "10:00", horaFin: "09:00" })).status).toBe(400);
    expect((await enviar({ horaInicio: "10:00", horaFin: "10:00" })).status).toBe(400);
  });
  it("responde 409 si el profesor está asignado a otra actividad, aunque sea del mismo gimnasio", async () => {
    const { a } = await crearEscenario();
    const yoga = await crearActividad(a.gimnasio.id);
    const boxeo = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);
    const vinculoBoxeo = await crearVinculo(a.gimnasio.id, boxeo.id, profesor.id);

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: yoga.id, actividadProfesorId: vinculoBoxeo.id });

    expect(res.status).toBe(409);
    expect(await prisma.horario.count({ where: { actividadId: yoga.id } })).toBe(0);
  });

  it("un profesor que da dos actividades solo se asigna con el vínculo de cada una", async () => {
    const { a } = await crearEscenario();
    const yoga = await crearActividad(a.gimnasio.id);
    const boxeo = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);
    const vinculoYoga = await crearVinculo(a.gimnasio.id, yoga.id, profesor.id);
    await crearVinculo(a.gimnasio.id, boxeo.id, profesor.id);

    const res = await request(app)
      .post(URL)
      .set(conToken(a.token))
      .send({ ...base, actividadId: yoga.id, actividadProfesorId: vinculoYoga.id });

    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/horarios/:id", () => {
  it("actualiza el día y las horas", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id);

    const res = await request(app)
      .patch(`${URL}/${horario.id}`)
      .set(conToken(a.token))
      .send({ diaSemana: "VIERNES", horaInicio: "07:00", horaFin: "08:30" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ diaSemana: "VIERNES", horaInicio: "07:00", horaFin: "08:30" });
  });

  it("permite cambiar una sola hora mientras siga siendo coherente con la otra", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id); // 18:00 a 19:00

    const res = await request(app)
      .patch(`${URL}/${horario.id}`)
      .set(conToken(a.token))
      .send({ horaFin: "20:00" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ horaInicio: "18:00", horaFin: "20:00" });
  });

  it("rechaza con 400 cambiar una sola hora si queda al revés de la que ya estaba guardada", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id); // 18:00 a 19:00
    const enviar = (cuerpo: object) =>
      request(app).patch(`${URL}/${horario.id}`).set(conToken(a.token)).send(cuerpo);

    expect((await enviar({ horaFin: "17:00" })).status).toBe(400);
    expect((await enviar({ horaInicio: "20:00" })).status).toBe(400);

    const intacto = await prisma.horario.findUniqueOrThrow({ where: { id: horario.id } });
    expect(intacto).toMatchObject({ horaInicio: "18:00", horaFin: "19:00" });
  });

  it("asigna un profesor y después lo quita mandando null", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);
    const vinculo = await crearVinculo(a.gimnasio.id, actividad.id, profesor.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id);
    const enviar = (cuerpo: object) =>
      request(app).patch(`${URL}/${horario.id}`).set(conToken(a.token)).send(cuerpo);

    expect((await enviar({ actividadProfesorId: vinculo.id })).body.actividadProfesorId).toBe(
      vinculo.id
    );
    expect((await enviar({ actividadProfesorId: null })).body.actividadProfesorId).toBeNull();
  });

  it("responde 404 al asignar una asignación de otro gimnasio, y no modifica el horario", async () => {
    const { a, b } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id);
    const actividadAjena = await crearActividad(b.gimnasio.id);
    const profesorAjeno = await crearProfesor(b.gimnasio.id);
    const vinculoAjeno = await crearVinculo(b.gimnasio.id, actividadAjena.id, profesorAjeno.id);

    const res = await request(app)
      .patch(`${URL}/${horario.id}`)
      .set(conToken(a.token))
      .send({ actividadProfesorId: vinculoAjeno.id });

    expect(res.status).toBe(404);
    const intacto = await prisma.horario.findUniqueOrThrow({ where: { id: horario.id } });
    expect(intacto.actividadProfesorId).toBeNull();
  });

  it("responde 404 para un horario de otro gimnasio y no lo modifica", async () => {
    const { a, b } = await crearEscenario();
    const actividadAjena = await crearActividad(b.gimnasio.id);
    const ajeno = await crearHorario(b.gimnasio.id, actividadAjena.id);

    const res = await request(app)
      .patch(`${URL}/${ajeno.id}`)
      .set(conToken(a.token))
      .send({ diaSemana: "DOMINGO" });

    expect(res.status).toBe(404);
    const intacto = await prisma.horario.findUniqueOrThrow({ where: { id: ajeno.id } });
    expect(intacto.diaSemana).toBe(ajeno.diaSemana);
  });

  it("rechaza con 400: campos no permitidos (actividadId, gimnasioId) o un body vacío", async () => {
    const { a, b } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const otra = await crearActividad(a.gimnasio.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id);
    const enviar = (cuerpo: object) =>
      request(app).patch(`${URL}/${horario.id}`).set(conToken(a.token)).send(cuerpo);

    expect((await enviar({ actividadId: otra.id })).status).toBe(400);
    expect((await enviar({ gimnasioId: b.gimnasio.id })).status).toBe(400);
    expect((await enviar({})).status).toBe(400);
  });

  it("responde 409 al asignar un profesor de otra actividad, y no modifica el horario", async () => {
    const { a } = await crearEscenario();
    const yoga = await crearActividad(a.gimnasio.id);
    const boxeo = await crearActividad(a.gimnasio.id);
    const profesor = await crearProfesor(a.gimnasio.id);
    const vinculoBoxeo = await crearVinculo(a.gimnasio.id, boxeo.id, profesor.id);
    const horarioYoga = await crearHorario(a.gimnasio.id, yoga.id);

    const res = await request(app)
      .patch(`${URL}/${horarioYoga.id}`)
      .set(conToken(a.token))
      .send({ actividadProfesorId: vinculoBoxeo.id });

    expect(res.status).toBe(409);
    const intacto = await prisma.horario.findUniqueOrThrow({ where: { id: horarioYoga.id } });
    expect(intacto.actividadProfesorId).toBeNull();
  });
});

describe("DELETE /api/horarios/:id", () => {
  it("borra el horario y responde 204", async () => {
    const { a } = await crearEscenario();
    const actividad = await crearActividad(a.gimnasio.id);
    const horario = await crearHorario(a.gimnasio.id, actividad.id);

    const res = await request(app).delete(`${URL}/${horario.id}`).set(conToken(a.token));

    expect(res.status).toBe(204);
    expect(await prisma.horario.findUnique({ where: { id: horario.id } })).toBeNull();
  });

  it("responde 404 para un horario de otro gimnasio y no lo borra", async () => {
    const { a, b } = await crearEscenario();
    const actividadAjena = await crearActividad(b.gimnasio.id);
    const ajeno = await crearHorario(b.gimnasio.id, actividadAjena.id);

    const res = await request(app).delete(`${URL}/${ajeno.id}`).set(conToken(a.token));

    expect(res.status).toBe(404);
    expect(await prisma.horario.findUnique({ where: { id: ajeno.id } })).not.toBeNull();
  });
});
