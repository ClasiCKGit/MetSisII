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
} from "../helpers/factories";

const app = createApp();

function fechaUtc(diasDesdeHoy: number) {
  const hoy = new Date();
  return new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + diasDesdeHoy, 12)
  );
}

describe("acceso a /api/membresias", () => {
  it("exige sesión para consultar", async () => {
    expect((await request(app).get("/api/membresias")).status).toBe(401);
  });

  it("rechaza una inscripción sin método de pago antes de crear registros", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);

    const res = await request(app)
      .post("/api/membresias/inscripciones")
      .set(conToken(a.token))
      .send({ socioId: socio.id, actividadId: actividad.id, tipoMembresiaId: tipo.id });

    expect(res.status).toBe(400);
    expect(await prisma.membresia.count()).toBe(0);
    expect(await prisma.pago.count()).toBe(0);
  });
});

describe("GET /api/membresias", () => {
  it("calcula vigencia, filtra por socio y gimnasio, y admite cancelar", async () => {
    const { a, b } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);
    const vencida = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
      fechaFin: fechaUtc(-1),
    });
    const porVencer = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
      fechaFin: fechaUtc(7),
    });
    const alDia = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
      fechaFin: fechaUtc(8),
    });
    const cancelada = await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
      fechaFin: fechaUtc(30),
      estado: "CANCELADA",
    });

    const otraActividad = await crearActividad(b.gimnasio.id);
    const otroTipo = await crearTipoMembresia(b.gimnasio.id, otraActividad.id);
    const otroSocio = await crearSocio(b.gimnasio.id);
    await crearMembresia(b.gimnasio.id, otroSocio.id, otraActividad.id, otroTipo.id, {
      fechaFin: fechaUtc(-1),
    });

    const lista = await request(app)
      .get("/api/membresias?socioId=" + socio.id)
      .set(conToken(a.token));
    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(4);
    expect(lista.body.find((item: { id: string }) => item.id === vencida.id).estadoVigencia).toBe(
      "VENCIDA"
    );
    expect(lista.body.find((item: { id: string }) => item.id === porVencer.id).estadoVigencia).toBe(
      "POR_VENCER"
    );
    expect(lista.body.find((item: { id: string }) => item.id === alDia.id).estadoVigencia).toBe(
      "AL_DIA"
    );
    expect(
      lista.body.find((item: { id: string }) => item.id === cancelada.id).estadoVigencia
    ).toBeNull();

    const filtrada = await request(app)
      .get(`/api/membresias?socioId=${socio.id}&vigencia=POR_VENCER`)
      .set(conToken(a.token));
    expect(filtrada.body.map((item: { id: string }) => item.id)).toEqual([porVencer.id]);
  });

  it("devuelve 404 al pedir una membresía de otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const socio = await crearSocio(b.gimnasio.id);
    const actividad = await crearActividad(b.gimnasio.id);
    const tipo = await crearTipoMembresia(b.gimnasio.id, actividad.id);
    const membresia = await crearMembresia(b.gimnasio.id, socio.id, actividad.id, tipo.id);

    const res = await request(app).get(`/api/membresias/${membresia.id}`).set(conToken(a.token));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/membresias/inscripciones", () => {
  it("crea la membresía y el pago vinculados en una transacción y serializa el Decimal", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id, { precio: "12500.50" });

    const res = await request(app)
      .post("/api/membresias/inscripciones")
      .set(conToken(a.token))
      .send({
        socioId: socio.id,
        actividadId: actividad.id,
        tipoMembresiaId: tipo.id,
        metodoPago: "TRANSFERENCIA",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      socioId: socio.id,
      actividadId: actividad.id,
      tipoMembresiaId: tipo.id,
      estadoVigencia: "AL_DIA",
      pago: { monto: "12500.50", metodoPago: "TRANSFERENCIA", estado: "PENDIENTE" },
    });
    expect(await prisma.membresia.count({ where: { id: res.body.id } })).toBe(1);
    expect(
      await prisma.pago.count({ where: { id: res.body.pago.id, membresiaId: res.body.id } })
    ).toBe(1);
  });

  it("si el socio ya tiene una membresía activa, no crea un pago huérfano", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    const actividad = await crearActividad(a.gimnasio.id);
    const tipo = await crearTipoMembresia(a.gimnasio.id, actividad.id);
    await crearMembresia(a.gimnasio.id, socio.id, actividad.id, tipo.id, {
      fechaFin: fechaUtc(30),
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

    expect(res.status).toBe(409);
    expect(await prisma.membresia.count()).toBe(1);
    expect(await prisma.pago.count()).toBe(0);
  });
});
