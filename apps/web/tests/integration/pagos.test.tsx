import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiCrearPago,
  apiCrearSocio,
  apiCrearUsuario,
  apiLoginToken,
  conSesion,
  nuevoGimnasio,
} from "../helpers/api";
import { renderApp } from "../helpers/render";

// jsdom no implementa URL.createObjectURL ni la descarga de un enlace: se capturan el
// archivo y el nombre con el que el navegador lo guardaría.
const descargas: Array<{ nombre: string; archivo: Blob }> = [];

beforeEach(() => {
  descargas.length = 0;
  let ultimo: Blob | undefined;
  URL.createObjectURL = vi.fn((archivo: Blob) => {
    ultimo = archivo;
    return "blob:reporte";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    if (ultimo) descargas.push({ nombre: this.download, archivo: ultimo });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pagos: exportar el reporte en CSV", () => {
  it("el administrador descarga los pagos del período filtrado, listos para Excel", async () => {
    const g = await nuevoGimnasio();
    const lucia = await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
    });
    await apiCrearPago(g.token, {
      socioId: lucia.id,
      monto: "1000.25",
      metodoPago: "EFECTIVO",
      estado: "PAGADO",
      concepto: "Cuota noviembre",
      fecha: "2026-11-15T15:00:00.000Z",
    });
    await apiCrearPago(g.token, {
      socioId: lucia.id,
      monto: "800",
      metodoPago: "TARJETA",
      estado: "PAGADO",
      concepto: "Cuota octubre",
      fecha: "2026-10-15T15:00:00.000Z",
    });
    await conSesion(g.token);
    const { user } = renderApp("/pagos");

    await screen.findByText("Cuota octubre");
    await user.type(screen.getByLabelText("Desde"), "2026-11-01");
    await user.type(screen.getByLabelText("Hasta"), "2026-11-30");
    await waitFor(() => expect(screen.queryByText("Cuota octubre")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    await waitFor(() => expect(descargas).toHaveLength(1));
    const [{ nombre, archivo }] = descargas;
    expect(nombre).toBe("pagos_2026-11-01_a_2026-11-30.csv");
    expect(archivo.type).toBe("text/csv;charset=utf-8");
    // Empieza con el BOM UTF-8 (EF BB BF) para que Excel lea las tildes. Al decodificar se
    // descarta un BOM: si quedara otro al principio, estaría duplicado.
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const texto = new TextDecoder().decode(bytes);
    expect(texto.startsWith("\uFEFF")).toBe(false);
    expect(texto.split("\r\n")).toEqual([
      "Fecha;Socio;Concepto;Método de pago;Estado;Monto",
      "15/11/2026 12:00;Pérez, Lucía;Cuota noviembre;Efectivo;Pagado;1000,25",
      "",
    ]);
  });

  it("sin pagos para exportar el botón queda deshabilitado", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    renderApp("/pagos");

    await screen.findByText("No hay pagos que coincidan con esos filtros.");
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeDisabled();
  });

  it("recepción ve los pagos pero no puede exportarlos", async () => {
    const g = await nuevoGimnasio();
    const socio = await apiCrearSocio(g.token, {
      nombre: "Lucía",
      apellido: "Pérez",
      dni: "30111222",
    });
    await apiCrearPago(g.token, {
      socioId: socio.id,
      monto: "1000",
      metodoPago: "EFECTIVO",
      concepto: "Cuota noviembre",
    });
    const recepcion = await apiCrearUsuario(g.token, {
      nombre: "Rita",
      apellido: "Recepción",
      email: `rita@${g.slug}.com`,
      rol: "RECEPCIONISTA",
    });
    await conSesion(await apiLoginToken(g.slug, recepcion.email, recepcion.password));
    renderApp("/pagos");

    expect(await screen.findByText("Cuota noviembre")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exportar CSV" })).not.toBeInTheDocument();
  });
});
