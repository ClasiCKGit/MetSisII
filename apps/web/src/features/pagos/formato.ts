import type { EstadoPago, MetodoPago, Pago } from "./types";

export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  RECHAZADO: "Rechazado",
};

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  MERCADO_PAGO: "Mercado Pago",
};

// Los montos llegan como texto decimal ("12500.50"): se suman en centavos enteros
// para no arrastrar errores de punto flotante.
export function aCentavos(monto: string): bigint {
  const [entero, decimal = ""] = monto.split(".");
  return BigInt(entero) * 100n + BigInt(decimal.padEnd(2, "0").slice(0, 2));
}

export function formatearCentavos(centavos: bigint): string {
  const entero = centavos / 100n;
  const decimal = (centavos % 100n).toString().padStart(2, "0");
  return `$${new Intl.NumberFormat("es-AR").format(entero)},${decimal}`;
}

export function formatearMonto(monto: string): string {
  return formatearCentavos(aCentavos(monto));
}

export function formatearFechaPago(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

export function conceptoDePago(pago: Pick<Pago, "concepto" | "membresia">): string {
  if (pago.concepto) return pago.concepto;
  return pago.membresia
    ? `${pago.membresia.actividad.nombre} · ${pago.membresia.tipoMembresia.nombre}`
    : "Pago suelto";
}
