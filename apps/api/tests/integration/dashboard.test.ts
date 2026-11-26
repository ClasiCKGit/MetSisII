import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { env } from "../../src/config/env";
import { rangoPorVencer } from "../../src/modules/membresias/vigencia";
import { rangoDelMes } from "../../src/utils/fechas";
import {
  conToken,
  crearActividad,
  crearEscenario,
  crearMembresia,
  crearPago,
  crearSocio,
  crearTipoMembresia,
  crearUsuario,
  tokenDe,
} from "../helpers/factories";

const app = createApp();

const resumenDe = (token: string) =>
  request(app).get("/api/dashboard/resumen").set(conToken(token));

// Socio, actividad y tipo listos para colgarles membresías
async function baseDeMembresias(gimnasioId: string) {
  const socio = await crearSocio(gimnasioId);
  const actividad = await crearActividad(gimnasioId);
  const tipo = await crearTipoMembresia(gimnasioId, actividad.id);
  return (fechaFin: Date, estado: "ACTIVA" | "VENCIDA" | "CANCELADA" = "ACTIVA") =>
    crearMembresia(gimnasioId, socio.id, actividad.id, tipo.id, {
      fechaInicio: new Date(fechaFin.getTime() - 30 * 24 * 60 * 60 * 1000),
      fechaFin,
      estado,
    });
}

describe("GET /api/dashboard/resumen", () => {
  it("exige sesión", async () => {
    const res = await request(app).get("/api/dashboard/resumen");
    expect(res.status).toBe(401);
  });

  it("lo ven tanto los administradores como la recepción", async () => {
    const { a } = await crearEscenario();
    const recepcion = await crearUsuario(a.gimnasio.id);

    const respuestas = await Promise.all([resumenDe(a.token), resumenDe(tokenDe(recepcion))]);
    expect(respuestas.map((r) => r.status)).toEqual([200, 200]);
  });

  it("con un gimnasio nuevo devuelve todo en cero", async () => {
    const { a } = await crearEscenario();

    const res = await resumenDe(a.token);

    expect(res.body).toEqual({ sociosActivos: 0, ingresosMes: "0.00", vencimientosProximos: 0 });
  });

  it("cuenta solo los socios activos del propio gimnasio", async () => {
    const { a, b } = await crearEscenario();
    await crearSocio(a.gimnasio.id);
    await crearSocio(a.gimnasio.id);
    await crearSocio(a.gimnasio.id, { activo: false });
    await crearSocio(b.gimnasio.id);

    const [deA, deB] = await Promise.all([resumenDe(a.token), resumenDe(b.token)]);

    expect(deA.body.sociosActivos).toBe(2);
    expect(deB.body.sociosActivos).toBe(1);
  });

  it("suma como ingresos del mes solo los pagos PAGADO del mes en curso del propio gimnasio", async () => {
    const { a, b } = await crearEscenario();
    const socio = await crearSocio(a.gimnasio.id);
    const ajeno = await crearSocio(b.gimnasio.id);
    const mes = rangoDelMes(new Date(), env.ZONA_HORARIA);
    const pago = (datos: Parameters<typeof crearPago>[2]) =>
      crearPago(a.gimnasio.id, socio.id, { estado: "PAGADO", ...datos });

    await pago({ monto: "1000.25", fecha: mes.desde }); // primer instante del mes: entra
    await pago({ monto: "500.50", fecha: new Date(mes.hasta.getTime() - 1) }); // último: entra
    await pago({ monto: "9999", fecha: new Date(mes.desde.getTime() - 1) }); // mes anterior
    await pago({ monto: "9999", fecha: mes.hasta }); // mes siguiente
    await pago({ monto: "9999", fecha: mes.desde, estado: "PENDIENTE" });
    await pago({ monto: "9999", fecha: mes.desde, estado: "RECHAZADO" });
    await crearPago(b.gimnasio.id, ajeno.id, { monto: "9999", fecha: mes.desde, estado: "PAGADO" });

    const res = await resumenDe(a.token);

    expect(res.status).toBe(200);
    expect(res.body.ingresosMes).toBe("1500.75");
  });

  it("cuenta como vencimientos próximos las membresías que vencen hoy o en los próximos 7 días", async () => {
    const { a, b } = await crearEscenario();
    const membresiaDeA = await baseDeMembresias(a.gimnasio.id);
    const membresiaDeB = await baseDeMembresias(b.gimnasio.id);
    const { desde, hasta } = rangoPorVencer(new Date());

    await membresiaDeA(desde); // vence hoy: entra
    await membresiaDeA(new Date(hasta.getTime() - 1)); // dentro de 7 días: entra
    await membresiaDeA(new Date(desde.getTime() - 1)); // ya vencida
    await membresiaDeA(hasta); // vence dentro de 8 días: todavía al día
    await membresiaDeA(desde, "CANCELADA");
    await membresiaDeB(desde); // de otro gimnasio

    const res = await resumenDe(a.token);

    expect(res.status).toBe(200);
    expect(res.body.vencimientosProximos).toBe(2);
  });
});
