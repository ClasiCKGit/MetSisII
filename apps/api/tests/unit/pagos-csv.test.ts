import { describe, expect, it } from "vitest";
import { pagosACsv, type PagoParaCsv } from "../../src/modules/pagos/pagos.csv";

const ZONA = "America/Argentina/Buenos_Aires";

function pago(datos: Partial<PagoParaCsv> = {}): PagoParaCsv {
  return {
    fecha: new Date("2026-11-05T15:30:00.000Z"),
    monto: "12500.50",
    metodoPago: "EFECTIVO",
    estado: "PAGADO",
    concepto: null,
    socio: { nombre: "Lucía", apellido: "Pérez" },
    membresia: null,
    ...datos,
  };
}

const lineas = (csv: string) => csv.replace(/^\uFEFF/, "").split("\r\n");

describe("pagosACsv", () => {
  it("empieza con BOM, separa con punto y coma y termina cada línea en CRLF", () => {
    const csv = pagosACsv([pago()], ZONA);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(lineas(csv)).toEqual([
      "Fecha;Socio;Concepto;Método de pago;Estado;Monto",
      "05/11/2026 12:30;Pérez, Lucía;Pago suelto;Efectivo;Pagado;12500,50",
      "",
    ]);
  });

  it("sin pagos deja solo el encabezado", () => {
    expect(lineas(pagosACsv([], ZONA))).toEqual([
      "Fecha;Socio;Concepto;Método de pago;Estado;Monto",
      "",
    ]);
  });

  it("muestra la fecha en la zona horaria del gimnasio, aunque en UTC sea otro día", () => {
    const csv = pagosACsv([pago({ fecha: new Date("2026-12-01T01:15:00.000Z") })], ZONA);
    expect(lineas(csv)[1]).toMatch(/^30\/11\/2026 22:15;/);
  });

  it("usa la actividad y el tipo de membresía como concepto si el pago no tiene uno", () => {
    const csv = pagosACsv(
      [
        pago({
          metodoPago: "MERCADO_PAGO",
          estado: "PENDIENTE",
          membresia: { actividad: { nombre: "Yoga" }, tipoMembresia: { nombre: "Mensual" } },
        }),
      ],
      ZONA
    );
    expect(lineas(csv)[1]).toBe(
      "05/11/2026 12:30;Pérez, Lucía;Yoga · Mensual;Mercado Pago;Pendiente;12500,50"
    );
  });

  it("encierra entre comillas los textos con punto y coma, comillas o saltos de línea", () => {
    const csv = pagosACsv([pago({ concepto: 'Cuota "noviembre"; con\nsalto' })], ZONA);
    expect(csv).toContain(';"Cuota ""noviembre""; con\nsalto";');
  });

  it("neutraliza los textos que Excel interpretaría como fórmula", () => {
    const csv = pagosACsv(
      [
        pago({ concepto: '=HYPERLINK("http://x")' }),
        pago({ socio: { nombre: "Ana", apellido: "+54911" }, concepto: "@SUMA" }),
        pago({ concepto: "-10" }),
      ],
      ZONA
    );
    const [, primera, segunda, tercera] = lineas(csv);
    expect(primera).toContain(';"\'=HYPERLINK(""http://x"")";');
    expect(segunda).toContain(";'+54911, Ana;'@SUMA;");
    expect(tercera).toContain(";'-10;");
  });
});
