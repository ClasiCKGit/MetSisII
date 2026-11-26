import { formatearFechaHora } from "../../utils/fechas";

// Reporte de pagos en CSV pensado para abrirse con Excel en español:
// - separador ";" (Excel con configuración regional es-AR usa la coma como separador decimal)
// - BOM UTF-8 al principio, para que Excel no rompa las tildes
// - fines de línea CRLF, como pide RFC 4180

export interface PagoParaCsv {
  fecha: Date;
  monto: string; // decimal textual con punto: "12500.50"
  metodoPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "MERCADO_PAGO";
  estado: "PENDIENTE" | "PAGADO" | "RECHAZADO";
  concepto: string | null;
  socio: { nombre: string; apellido: string };
  membresia: { actividad: { nombre: string }; tipoMembresia: { nombre: string } } | null;
}

const BOM = "\uFEFF";
const SEPARADOR = ";";
const FIN_DE_LINEA = "\r\n";

const ENCABEZADOS = ["Fecha", "Socio", "Concepto", "Método de pago", "Estado", "Monto"];

const METODO_PAGO: Record<PagoParaCsv["metodoPago"], string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  MERCADO_PAGO: "Mercado Pago",
};

const ESTADO: Record<PagoParaCsv["estado"], string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  RECHAZADO: "Rechazado",
};

// Un texto que empieza con = + - @ (o tab/CR) Excel lo ejecuta como fórmula (inyección de CSV):
// se antepone un apóstrofo para que lo muestre como texto.
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

function celda(valor: string): string {
  const seguro = INICIO_DE_FORMULA.test(valor) ? `'${valor}` : valor;
  return /[";\r\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro;
}

// Mismo criterio que la pantalla de pagos del frontend
function concepto(pago: PagoParaCsv): string {
  if (pago.concepto) return pago.concepto;
  return pago.membresia
    ? `${pago.membresia.actividad.nombre} · ${pago.membresia.tipoMembresia.nombre}`
    : "Pago suelto";
}

export function pagosACsv(pagos: PagoParaCsv[], zonaHoraria: string): string {
  const filas = pagos.map((pago) => [
    formatearFechaHora(pago.fecha, zonaHoraria),
    `${pago.socio.apellido}, ${pago.socio.nombre}`,
    concepto(pago),
    METODO_PAGO[pago.metodoPago],
    ESTADO[pago.estado],
    pago.monto.replace(".", ","),
  ]);
  const lineas = [ENCABEZADOS, ...filas].map((fila) => fila.map(celda).join(SEPARADOR));
  return BOM + lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}
