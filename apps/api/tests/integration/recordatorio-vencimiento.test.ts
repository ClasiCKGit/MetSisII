import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/config/database";
import { resetDb } from "../helpers/db";
import {
  crearActividad,
  crearGimnasio,
  crearMembresia,
  crearSocio,
  crearTipoMembresia,
} from "../helpers/factories";
import * as mailer from "../../src/utils/mailer";
import { enviarRecordatoriosDeVencimiento } from "../../src/jobs/recordatorio-vencimiento.job";

// Mock completo: evita instanciar el cliente real de Resend y mandar mails de verdad en CI
vi.mock("../../src/utils/mailer", () => ({ enviarMail: vi.fn() }));
const enviarMail = vi.mocked(mailer.enviarMail);

const diasDesdeHoy = (dias: number) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

async function crearEscenarioBase(datosSocio = {}) {
  const gimnasio = await crearGimnasio();
  const socio = await crearSocio(gimnasio.id, { email: "socio@test.com", ...datosSocio });
  const actividad = await crearActividad(gimnasio.id);
  const tipoMembresia = await crearTipoMembresia(gimnasio.id, actividad.id);
  return { gimnasio, socio, actividad, tipoMembresia };
}

beforeEach(async () => {
  await resetDb();
  enviarMail.mockClear();
  enviarMail.mockResolvedValue(undefined);
});

describe("enviarRecordatoriosDeVencimiento", () => {
  it("manda un mail y marca recordatorioEnviado para una membresía por vencer", async () => {
    const { gimnasio, socio, actividad, tipoMembresia } = await crearEscenarioBase();
    const membresia = await crearMembresia(gimnasio.id, socio.id, actividad.id, tipoMembresia.id, {
      fechaFin: diasDesdeHoy(3),
    });

    await enviarRecordatoriosDeVencimiento();

    expect(enviarMail).toHaveBeenCalledTimes(1);
    expect(enviarMail.mock.calls[0][0].to).toBe(socio.email);

    const actualizada = await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } });
    expect(actualizada.recordatorioEnviado).toBe(true);
  });

  it("no manda mail si ya se había notificado antes", async () => {
    const { gimnasio, socio, actividad, tipoMembresia } = await crearEscenarioBase();
    await crearMembresia(gimnasio.id, socio.id, actividad.id, tipoMembresia.id, {
      fechaFin: diasDesdeHoy(3),
      recordatorioEnviado: true,
    });

    await enviarRecordatoriosDeVencimiento();

    expect(enviarMail).not.toHaveBeenCalled();
  });

  it("no manda mail si la membresía ya fue renovada", async () => {
    const { gimnasio, socio, actividad, tipoMembresia } = await crearEscenarioBase();
    await crearMembresia(gimnasio.id, socio.id, actividad.id, tipoMembresia.id, {
      fechaFin: diasDesdeHoy(3),
      renovada: true,
    });

    await enviarRecordatoriosDeVencimiento();

    expect(enviarMail).not.toHaveBeenCalled();
  });

  it("no manda mail si la membresía está cancelada", async () => {
    const { gimnasio, socio, actividad, tipoMembresia } = await crearEscenarioBase();
    await crearMembresia(gimnasio.id, socio.id, actividad.id, tipoMembresia.id, {
      fechaFin: diasDesdeHoy(3),
      estado: "CANCELADA",
    });

    await enviarRecordatoriosDeVencimiento();

    expect(enviarMail).not.toHaveBeenCalled();
  });

  it("no manda mail si la membresía vence fuera de la ventana de aviso", async () => {
    const { gimnasio, socio, actividad, tipoMembresia } = await crearEscenarioBase();
    await crearMembresia(gimnasio.id, socio.id, actividad.id, tipoMembresia.id, {
      fechaFin: diasDesdeHoy(30),
    });

    await enviarRecordatoriosDeVencimiento();

    expect(enviarMail).not.toHaveBeenCalled();
  });

  it("no manda mail si el socio no tiene email cargado", async () => {
    const gimnasio = await crearGimnasio();
    const socio = await crearSocio(gimnasio.id);
    const actividad = await crearActividad(gimnasio.id);
    const tipoMembresia = await crearTipoMembresia(gimnasio.id, actividad.id);
    await crearMembresia(gimnasio.id, socio.id, actividad.id, tipoMembresia.id, {
      fechaFin: diasDesdeHoy(3),
    });

    await enviarRecordatoriosDeVencimiento();

    expect(enviarMail).not.toHaveBeenCalled();
  });
});
