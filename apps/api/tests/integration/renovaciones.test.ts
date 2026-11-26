import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import {
  conToken,
  crearActividad,
  crearEscenario,
  crearMembresia,
  crearSocio,
  crearTipoMembresia,
  crearUsuario,
  tokenDe,
} from "../helpers/factories";

const app = createApp();

const DIA = 24 * 60 * 60 * 1000;
const enDias = (dias: number) => new Date(Date.now() + dias * DIA);

// Socio con una membresía de 30 días que vence en `venceEnDias` días
async function escenarioConMembresia(venceEnDias = 5) {
  const { a, b } = await crearEscenario();
  const socio = await crearSocio(a.gimnasio.id);
  const actividad = await crearActividad(a.gimnasio.id);
  const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id, { precio: "12500.50" });
  const membresia = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
    fechaInicio: enDias(venceEnDias - 30),
    fechaFin: enDias(venceEnDias),
  });
  return { a, b, socio, actividad, tipo, membresia };
}

const renovar = (id: string, token: string, body: object = { metodoPago: "EFECTIVO" }) =>
  request(app).post(`/api/membresias/${id}/renovaciones`).set(conToken(token)).send(body);

describe("POST /api/membresias/:id/renovaciones", () => {
  it("exige sesión", async () => {
    const { membresia } = await escenarioConMembresia();

    const res = await request(app)
      .post(`/api/membresias/${membresia.id}/renovaciones`)
      .send({ metodoPago: "EFECTIVO" });

    expect(res.status).toBe(401);
    expect(await prisma.membresia.count()).toBe(1);
  });

  it("antes de vencer: la nueva empieza cuando termina la actual, con su pago, y marca la actual", async () => {
    const { a, membresia, tipo } = await escenarioConMembresia(5);

    const res = await renovar(membresia.id, a.token, { metodoPago: "TRANSFERENCIA" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      tipoMembresiaId: tipo.id,
      renovada: false,
      pago: { monto: "12500.50", metodoPago: "TRANSFERENCIA", estado: "PENDIENTE" },
    });
    expect(new Date(res.body.fechaInicio).getTime()).toBe(membresia.fechaFin.getTime());
    expect(new Date(res.body.fechaFin).getTime() - membresia.fechaFin.getTime()).toBe(30 * DIA);

    const actual = await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } });
    expect(actual).toMatchObject({ renovada: true, recordatorioEnviado: true });
    expect(
      await prisma.pago.count({ where: { id: res.body.pago.id, membresiaId: res.body.id } })
    ).toBe(1);
  });

  it("ya vencida: la nueva empieza hoy", async () => {
    const { a, membresia } = await escenarioConMembresia(-10);
    const antes = Date.now();

    const res = await renovar(membresia.id, a.token);

    expect(res.status).toBe(201);
    const inicio = new Date(res.body.fechaInicio).getTime();
    expect(inicio).toBeGreaterThanOrEqual(antes - 1000);
    expect(inicio).toBeLessThanOrEqual(Date.now());
    expect(res.body.estadoVigencia).toBe("AL_DIA");
  });

  it("con otro tipo de la misma actividad usa su precio y su duración", async () => {
    const { a, membresia, actividad } = await escenarioConMembresia();
    const trimestral = await crearTipoMembresia(a.gimnasio.id, actividad.id, {
      precio: "33000",
      duracionDias: 90,
    });

    const res = await renovar(membresia.id, a.token, {
      tipoMembresiaId: trimestral.id,
      metodoPago: "EFECTIVO",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      tipoMembresiaId: trimestral.id,
      pago: { monto: "33000.00" },
    });
    expect(new Date(res.body.fechaFin).getTime() - membresia.fechaFin.getTime()).toBe(90 * DIA);
  });

  it("la recepción también puede renovar", async () => {
    const { a, membresia } = await escenarioConMembresia();
    const recepcionista = await crearUsuario(a.gimnasio.id, { rol: "RECEPCIONISTA" });

    const res = await renovar(membresia.id, tokenDe(recepcionista));

    expect(res.status).toBe(201);
  });

  it("no se puede renovar dos veces la misma membresía", async () => {
    const { a, membresia } = await escenarioConMembresia();
    expect((await renovar(membresia.id, a.token)).status).toBe(201);

    const res = await renovar(membresia.id, a.token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("La membresía ya fue renovada");
    expect(await prisma.membresia.count()).toBe(2);
    expect(await prisma.pago.count()).toBe(1);
  });

  it("dos renovaciones simultáneas crean una sola membresía nueva", async () => {
    const { a, membresia } = await escenarioConMembresia();

    const respuestas = await Promise.all([
      renovar(membresia.id, a.token),
      renovar(membresia.id, a.token),
    ]);

    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.membresia.count()).toBe(2);
    expect(await prisma.pago.count()).toBe(1);
  });

  it("rechaza renovar una membresía cancelada", async () => {
    const { a, socio, actividad, tipo } = await escenarioConMembresia();
    const cancelada = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
      fechaInicio: enDias(-60),
      fechaFin: enDias(-30),
      estado: "CANCELADA",
    });

    const res = await renovar(cancelada.id, a.token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("No se puede renovar una membresía cancelada");
    expect(await prisma.pago.count()).toBe(0);
  });

  it("rechaza renovar una vencida si el socio ya se volvió a inscribir en la actividad", async () => {
    const { a, socio, actividad, tipo, membresia: vigente } = await escenarioConMembresia(20);
    const vieja = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
      fechaInicio: enDias(-60),
      fechaFin: enDias(-30),
    });

    const res = await renovar(vieja.id, a.token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("El socio ya tiene una membresía activa para esta actividad");
    expect(await prisma.membresia.count({ where: { renovada: true } })).toBe(0);
    expect(vigente.renovada).toBe(false);
  });

  it("respeta el cupo, sin contar la membresía que se renueva", async () => {
    const { a, actividad, tipo, membresia } = await escenarioConMembresia();
    await prisma.actividad.update({ where: { id: actividad.id }, data: { cupo: 2 } });
    // Otro socio ocupa el segundo lugar también después de que vence la actual
    const otro = await crearSocio(a.gimnasio.id);
    await crearMembresia(a.gimnasio.id, otro.id, actividad.id, tipo.id, {
      fechaInicio: enDias(-1),
      fechaFin: enDias(40),
    });

    expect((await renovar(membresia.id, a.token)).status).toBe(201);

    // Con cupo 1, el otro socio llena la actividad en la fecha en que empezaría la renovación
    const { membresia: segunda, actividad: llena } = await escenarioConMembresia();
    await prisma.actividad.update({ where: { id: llena.id }, data: { cupo: 1 } });
    const ocupante = await crearSocio(segunda.gimnasioId);
    await crearMembresia(segunda.gimnasioId, ocupante.id, llena.id, segunda.tipoMembresiaId, {
      fechaInicio: enDias(-1),
      fechaFin: enDias(40),
    });
    const token = tokenDe(
      await prisma.usuario.findFirstOrThrow({ where: { gimnasioId: segunda.gimnasioId } })
    );

    const res = await renovar(segunda.id, token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("La actividad no tiene cupo disponible");
    expect((await prisma.membresia.findUniqueOrThrow({ where: { id: segunda.id } })).renovada).toBe(
      false
    );
  });

  it("rechaza un tipo de otra actividad o dado de baja", async () => {
    const { a, membresia, actividad } = await escenarioConMembresia();
    const otraActividad = await crearActividad(a.gimnasio.id);
    const ajeno = await crearTipoMembresia(a.gimnasio.id, otraActividad.id);
    const deBaja = await crearTipoMembresia(a.gimnasio.id, actividad.id, { activo: false });

    for (const tipo of [ajeno, deBaja]) {
      const res = await renovar(membresia.id, a.token, {
        tipoMembresiaId: tipo.id,
        metodoPago: "EFECTIVO",
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("El tipo de membresía no está activo para esta actividad");
    }
    expect(await prisma.membresia.count()).toBe(1);
  });

  it("si el tipo de la membresía fue dado de baja, pide elegir otro", async () => {
    const { a, membresia, tipo } = await escenarioConMembresia();
    await prisma.tipoMembresia.update({ where: { id: tipo.id }, data: { activo: false } });

    const res = await renovar(membresia.id, a.token);

    expect(res.status).toBe(400);
    expect(await prisma.membresia.count()).toBe(1);
  });

  it("rechaza socio dado de baja o actividad inactiva", async () => {
    const { a, membresia, socio, actividad } = await escenarioConMembresia();
    await prisma.socio.update({ where: { id: socio.id }, data: { activo: false } });
    expect((await renovar(membresia.id, a.token)).status).toBe(404);

    await prisma.socio.update({ where: { id: socio.id }, data: { activo: true } });
    await prisma.actividad.update({ where: { id: actividad.id }, data: { activa: false } });
    expect((await renovar(membresia.id, a.token)).status).toBe(404);
    expect(await prisma.membresia.count()).toBe(1);
  });

  it.each([
    [{}, "sin método de pago"],
    [{ metodoPago: "CHEQUE" }, "con un método de pago inválido"],
    [{ metodoPago: "EFECTIVO", tipoMembresiaId: "no-es-uuid" }, "con un tipo que no es UUID"],
    [{ metodoPago: "EFECTIVO", fechaInicio: "2030-01-01T00:00:00Z" }, "eligiendo la fecha"],
  ])("responde 400 %s y no crea nada (%s)", async (body) => {
    const { a, membresia } = await escenarioConMembresia();

    const res = await renovar(membresia.id, a.token, body);

    expect(res.status).toBe(400);
    expect(await prisma.membresia.count()).toBe(1);
    expect(await prisma.pago.count()).toBe(0);
  });

  it("responde 404 sobre una membresía de otro gimnasio y no la modifica", async () => {
    const { b, membresia } = await escenarioConMembresia();

    const res = await renovar(membresia.id, b.token);

    expect(res.status).toBe(404);
    expect(await prisma.membresia.count()).toBe(1);
    expect(
      (await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } })).renovada
    ).toBe(false);
  });
});

describe("una membresía renovada", () => {
  it("no cuenta en los vencimientos próximos del inicio", async () => {
    const { a, membresia } = await escenarioConMembresia(3);
    const antes = await request(app).get("/api/dashboard/resumen").set(conToken(a.token));
    expect(antes.body.vencimientosProximos).toBe(1);

    await renovar(membresia.id, a.token);

    const despues = await request(app).get("/api/dashboard/resumen").set(conToken(a.token));
    expect(despues.body.vencimientosProximos).toBe(0);
  });

  it("se puede crear una inscripción nueva cuando la renovación también terminó", async () => {
    const { a, socio, actividad, tipo, membresia } = await escenarioConMembresia(-40);
    await renovar(membresia.id, a.token);
    await prisma.membresia.updateMany({
      where: { renovada: false },
      data: { fechaInicio: enDias(-30), fechaFin: enDias(-1) },
    });

    const res = await request(app)
      .post("/api/membresias/inscripciones")
      .set(conToken(a.token))
      .send({
        socioId: socio.id,
        actividadId: actividad.id,
        tipoMembresiaId: tipo.id,
        metodoPago: "EFECTIVO",
      });

    expect(res.status).toBe(201);
  });
});
