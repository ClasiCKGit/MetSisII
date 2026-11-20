export type EstadoPago = "PENDIENTE" | "PAGADO" | "RECHAZADO";
export type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "MERCADO_PAGO";

export interface Pago {
  id: string;
  monto: string;
  fecha: string;
  metodoPago: MetodoPago;
  estado: EstadoPago;
  concepto: string | null;
  socio: { id: string; nombre: string; apellido: string };
  membresia: {
    id: string;
    actividad: { id: string; nombre: string };
    tipoMembresia: { id: string; nombre: string };
  } | null;
}

export interface FiltrosPagos {
  desde?: string;
  hasta?: string;
  socioId?: string;
  estado?: EstadoPago;
}
