import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/config/database";
import { conToken, crearEscenario, crearPago, crearSocio } from "../helpers/factories";

const app = createApp();

describe("acceso a /api/pagos", () => {
  it("exige sesión para consultar", async () => {
    expect((await request(app).get("/api/pagos")).status).toBe(401);
  });
});

describe("GET /api/pagos", () => {
  it("lista solo pagos del gimnasio y conserva el Decimal como texto", async () => {
    const { a, b } = await crearEscenario();
    const socioA = await crearSocio(a.gimnasio.id);
    const socioB = await crearSocio(b.gimnasio.id);
    const pagoA = await crearPago(a.gimnasio.id, socioA.id, { monto: "12345.60" });
    await crearPago(b.gimnasio.id, socioB.id, { monto: "999.99" });

    const res = await request(app).get("/api/pagos").set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: pagoA.id, monto: "12345.60", estado: "PENDIENTE" });
  });

  it("filtra por socio, estado y rango de fechas inclusivo", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    const otroSocio = await crearSocio(a.gimnasio.id);
    const desde = new Date("2026-11-01T00:00:00.000Z");
    const dentro = new Date("2026-11-05T12:00:00.000Z");
    const hasta = new Date("2026-11-10T23:59:59.999Z");
    const coincide = await crearPago(a.gimnasio.id, socio.id, {
      fecha: dentro,
      estado: "PAGADO",
      metodoPago: "TRANSFERENCIA",
    });
    await crearPago(a.gimnasio.id, socio.id, { fecha: dentro, estado: "PENDIENTE" });
    await crearPago(a.gimnasio.id, otroSocio.id, { fecha: dentro, estado: "PAGADO" });
    await crearPago(a.gimnasio.id, socio.id, {
      fecha: new Date("2026-10-31T23:59:59.999Z"),
      estado: "PAGADO",
    });
    await crearPago(a.gimnasio.id, socio.id, {
      fecha: new Date("2026-11-11T00:00:00.000Z"),
      estado: "PAGADO",
    });

    const res = await request(app)
      .get("/api/pagos")
      .query({
        socioId: socio.id,
        estado: "PAGADO",
        metodoPago: "TRANSFERENCIA",
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      })
      .set(conToken(a.token));

    expect(res.status).toBe(200);
    expect(res.body.map((pago: { id: string }) => pago.id)).toEqual([coincide.id]);
  });

  it("responde 400 si el rango de fechas está invertido", async () => {
    const { a } = await crearEscenario();
    const res = await request(app)
      .get("/api/pagos")
      .query({ desde: "2026-11-20T00:00:00.000Z", hasta: "2026-11-19T00:00:00.000Z" })
      .set(conToken(a.token));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/pagos", () => {
  it("crea un pago y devuelve el monto Decimal con dos decimales", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);

    const res = await request(app)
      .post("/api/pagos")
      .set(conToken(a.token))
      .send({ socioId: socio.id, monto: "1234.50", metodoPago: "TARJETA" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      monto: "1234.50",
      metodoPago: "TARJETA",
      estado: "PENDIENTE",
    });
    const guardado = await prisma.pago.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardado.monto.toFixed(2)).toBe("1234.50");
  });

  it("rechaza un socio de otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const socioAjeno = await crearSocio(b.gimnasio.id);
    const res = await request(app)
      .post("/api/pagos")
      .set(conToken(a.token))
      .send({ socioId: socioAjeno.id, monto: "100", metodoPago: "EFECTIVO" });

    expect(res.status).toBe(404);
    expect(await prisma.pago.count()).toBe(0);
  });

  it("rechaza importes con más de dos decimales o fuera de rango", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    const enviar = (monto: string) =>
      request(app)
        .post("/api/pagos")
        .set(conToken(a.token))
        .send({ socioId: socio.id, monto, metodoPago: "EFECTIVO" });

    expect((await enviar("10.999")).status).toBe(400);
    expect((await enviar("100000000.00")).status).toBe(400);
    expect(await prisma.pago.count()).toBe(0);
  });
});

describe("PATCH /api/pagos/:id/estado", () => {
  it("permite pasar de pendiente a pagado y no modifica un estado final", async () => {
    const { a } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    const pago = await crearPago(a.gimnasio.id, socio.id);

    const actualizado = await request(app)
      .patch(`/api/pagos/${pago.id}/estado`)
      .set(conToken(a.token))
      .send({ estado: "PAGADO" });
    expect(actualizado.status).toBe(200);
    expect(actualizado.body.estado).toBe("PAGADO");
    expect(actualizado.body.monto).toBe("12500.50");

    const segundoCambio = await request(app)
      .patch(`/api/pagos/${pago.id}/estado`)
      .set(conToken(a.token))
      .send({ estado: "RECHAZADO" });
    expect(segundoCambio.status).toBe(409);
    expect((await prisma.pago.findUniqueOrThrow({ where: { id: pago.id } })).estado).toBe("PAGADO");
  });

  it("no permite cambiar un pago que pertenece a otro gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const socioAjeno = await crearSocio(b.gimnasio.id);
    const pagoAjeno = await crearPago(b.gimnasio.id, socioAjeno.id);

    const res = await request(app)
      .patch(`/api/pagos/${pagoAjeno.id}/estado`)
      .set(conToken(a.token))
      .send({ estado: "PAGADO" });

    expect(res.status).toBe(404);
    expect((await prisma.pago.findUniqueOrThrow({ where: { id: pagoAjeno.id } })).estado).toBe(
      "PENDIENTE"
    );
  });
});
