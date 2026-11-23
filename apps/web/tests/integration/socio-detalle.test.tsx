import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  apiCrearActividad,
  apiCrearPago,
  apiCrearSocio,
  apiCrearTipoMembresia,
  apiInscribir,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { renderApp } from "../helpers/render";

const listaMembresias = () => screen.findByRole("list", { name: "Membresías del socio" });
const listaPagos = () => screen.findByRole("list", { name: "Pagos del socio" });

describe("detalle del socio: membresías e historial de pagos", () => {
  it("sin membresías ni pagos lo avisa en cada sección", async () => {
    const g = await nuevoGimnasio();
    const socio = await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
    });
    await conSesion(g.token);
    renderApp(`/socios/${socio.id}`);

    expect(await screen.findByText("Este socio todavía no tiene membresías.")).toBeInTheDocument();
    expect(await screen.findByText("Este socio todavía no tiene pagos.")).toBeInTheDocument();
  });

  it("al inscribirlo muestra la membresía al día y su pago pendiente con el monto", async () => {
    const g = await nuevoGimnasio();
    const socio = await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
    });
    const yoga = await apiCrearActividad(g.token, { nombre: "Yoga" });
    const mensual = await apiCrearTipoMembresia(g.token, {
      actividadId: yoga.id,
      nombre: "Mensual",
      precio: 12500.5,
      duracionDias: 30,
    });
    await apiInscribir(g.token, {
      socioId: socio.id,
      actividadId: yoga.id,
      tipoMembresiaId: mensual.id,
      metodoPago: "TRANSFERENCIA",
    });
    await conSesion(g.token);
    renderApp(`/socios/${socio.id}`);

    const membresia = within(await listaMembresias()).getByRole("listitem");
    expect(membresia).toHaveTextContent("Yoga");
    expect(membresia).toHaveTextContent(/Mensual · vence el/);
    expect(within(membresia).getByText("Al día")).toBeInTheDocument();

    const pago = within(await listaPagos()).getByRole("listitem");
    expect(within(pago).getByText("Yoga · Mensual")).toBeInTheDocument();
    expect(pago).toHaveTextContent("Transferencia");
    expect(within(pago).getByText("$12.500,50")).toBeInTheDocument();
    expect(within(pago).getByText("Pendiente")).toBeInTheDocument();
  });

  it("lista solo los pagos de ese socio, del más reciente al más antiguo", async () => {
    const g = await nuevoGimnasio();
    const socio = await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
    });
    const otro = await apiCrearSocio(g.token, {
      nombre: "Diego",
      apellido: "Torres",
      dni: "30111333",
    });
    await apiCrearPago(g.token, {
      socioId: socio.id,
      monto: "5000",
      metodoPago: "EFECTIVO",
      estado: "PAGADO",
      concepto: "Matrícula",
      fecha: "2026-01-10T15:00:00.000Z",
    });
    await apiCrearPago(g.token, {
      socioId: socio.id,
      monto: "1500.75",
      metodoPago: "TARJETA",
      estado: "RECHAZADO",
      concepto: "Clase suelta",
      fecha: "2026-02-10T15:00:00.000Z",
    });
    await apiCrearPago(g.token, {
      socioId: otro.id,
      monto: "999",
      metodoPago: "EFECTIVO",
      concepto: "Pago de otro socio",
    });
    await conSesion(g.token);
    renderApp(`/socios/${socio.id}`);

    const pagos = within(await listaPagos()).getAllByRole("listitem");
    expect(pagos).toHaveLength(2);
    expect(pagos[0]).toHaveTextContent("Clase suelta");
    expect(within(pagos[0]).getByText("$1.500,75")).toBeInTheDocument();
    expect(within(pagos[0]).getByText("Rechazado")).toBeInTheDocument();
    expect(pagos[1]).toHaveTextContent("Matrícula");
    expect(within(pagos[1]).getByText("$5.000,00")).toBeInTheDocument();
    expect(within(pagos[1]).getByText("Pagado")).toBeInTheDocument();
    expect(screen.queryByText("Pago de otro socio")).not.toBeInTheDocument();
  });
});
