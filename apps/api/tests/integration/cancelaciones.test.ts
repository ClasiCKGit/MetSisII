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

async function escenario() {
  const { a, b } = await crearEscenario();
  const socio = await crearSocio(a.gimnasio.id);
  const actividad = await crearActividad(a.gimnasio.id);
  const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);
  const membresia = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
    fechaInicio: enDias(-10),
    fechaFin: enDias(20),
  });
  return { a, b, socio, actividad, tipo, membresia };
}

const crearPago = (
  gimnasioId: string,
  socioId: string,
  membresiaId: string,
  estado: "PENDIENTE" | "PAGADO"
) =>
  prisma.pago.create({
    data: { gimnasioId, socioId, membresiaId, monto: "12500", metodoPago: "EFECTIVO", estado },
  });

const cancelar = (id: string, token: string) =>
  request(app).post(`/api/membresias/${id}/cancelacion`).set(conToken(token));

describe("POST /api/membresias/:id/cancelacion", () => {
  it("exige sesión", async () => {
    const { membresia } = await escenario();

    const res = await request(app).post(`/api/membresias/${membresia.id}/cancelacion`);

    expect(res.status).toBe(401);
    expect((await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } })).estado).toBe(
      "ACTIVA"
    );
  });

  it("es solo para administradores", async () => {
    const { a, membresia } = await escenario();
    const recepcionista = await crearUsuario(a.gimnasio.id, { rol: "RECEPCIONISTA" });

    const res = await cancelar(membresia.id, tokenDe(recepcionista));

    expect(res.status).toBe(403);
    expect((await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } })).estado).toBe(
      "ACTIVA"
    );
  });

  it("la cancela, rechaza sus pagos pendientes y no toca los pagados", async () => {
    const { a, socio, membresia } = await escenario();
    const pendiente = await crearPago(a.gimnasio.id, socio.id, membresia.id, "PENDIENTE");
    const pagado = await crearPago(a.gimnasio.id, socio.id, membresia.id, "PAGADO");

    const res = await cancelar(membresia.id, a.token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: membresia.id,
      estado: "CANCELADA",
      estadoVigencia: null,
      pagosRechazados: 1,
    });
    expect((await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } })).estado).toBe(
      "CANCELADA"
    );
    expect((await prisma.pago.findUniqueOrThrow({ where: { id: pendiente.id } })).estado).toBe(
      "RECHAZADO"
    );
    expect((await prisma.pago.findUniqueOrThrow({ where: { id: pagado.id } })).estado).toBe(
      "PAGADO"
    );
  });

  it("no se cancela dos veces", async () => {
    const { a, membresia } = await escenario();
    expect((await cancelar(membresia.id, a.token)).status).toBe(200);

    const res = await cancelar(membresia.id, a.token);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("La membresía ya está cancelada");
  });

  it("libera el cupo: el lugar se puede ocupar con otra inscripción", async () => {
    const { a, actividad, tipo, membresia } = await escenario();
    await prisma.actividad.update({ where: { id: actividad.id }, data: { cupo: 1 } });
    const otro = await crearSocio(a.gimnasio.id);
    const inscribir = () =>
      request(app).post("/api/membresias/inscripciones").set(conToken(a.token)).send({
        socioId: otro.id,
        actividadId: actividad.id,
        tipoMembresiaId: tipo.id,
        metodoPago: "EFECTIVO",
      });
    expect((await inscribir()).status).toBe(409);

    await cancelar(membresia.id, a.token);

    expect((await inscribir()).status).toBe(201);
  });

  it("cancelar una renovación deja la membresía anterior sin renovar, para poder renovarla otra vez", async () => {
    const { a, membresia } = await escenario();
    const renovacion = await request(app)
      .post(`/api/membresias/${membresia.id}/renovaciones`)
      .set(conToken(a.token))
      .send({ metodoPago: "EFECTIVO" });
    expect(renovacion.status).toBe(201);

    await cancelar(renovacion.body.id, a.token);

    expect(
      (await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } })).renovada
    ).toBe(false);
    const otraVez = await request(app)
      .post(`/api/membresias/${membresia.id}/renovaciones`)
      .set(conToken(a.token))
      .send({ metodoPago: "EFECTIVO" });
    expect(otraVez.status).toBe(201);
  });

  it("deja de contar en los vencimientos próximos", async () => {
    const { a, socio, actividad, tipo } = await escenario();
    const porVencer = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
      fechaInicio: enDias(-27),
      fechaFin: enDias(3),
    });
    const resumen = () => request(app).get("/api/dashboard/resumen").set(conToken(a.token));
    expect((await resumen()).body.vencimientosProximos).toBe(1);

    await cancelar(porVencer.id, a.token);

    expect((await resumen()).body.vencimientosProximos).toBe(0);
  });

  it("después de cancelarla no se le puede registrar un pago", async () => {
    const { a, socio, membresia } = await escenario();
    await cancelar(membresia.id, a.token);

    const res = await request(app).post("/api/pagos").set(conToken(a.token)).send({
      socioId: socio.id,
      membresiaId: membresia.id,
      monto: 12500,
      metodoPago: "EFECTIVO",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("La membresía está cancelada");
    expect(await prisma.pago.count()).toBe(0);
  });

  it("responde 400 con un id que no es UUID", async () => {
    const { a } = await escenario();

    const res = await cancelar("no-es-uuid", a.token);

    expect(res.status).toBe(400);
  });

  it("responde 404 sobre una membresía de otro gimnasio y no la modifica", async () => {
    const { a, b, socio, membresia } = await escenario();
    const pendiente = await crearPago(a.gimnasio.id, socio.id, membresia.id, "PENDIENTE");

    const res = await cancelar(membresia.id, b.token);

    expect(res.status).toBe(404);
    expect((await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } })).estado).toBe(
      "ACTIVA"
    );
    expect((await prisma.pago.findUniqueOrThrow({ where: { id: pendiente.id } })).estado).toBe(
      "PENDIENTE"
    );
  });
});
