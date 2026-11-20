import { Prisma } from "../../generated/prisma/client";
import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import type { CrearPagoInput, ListarPagosQuery } from "./pagos.schema";

const pagoInclude = {
  socio: { select: { id: true, nombre: true, apellido: true } },
  membresia: {
    select: {
      id: true,
      actividad: { select: { id: true, nombre: true } },
      tipoMembresia: { select: { id: true, nombre: true } },
    },
  },
} as const;

type PagoConRelaciones = Prisma.PagoGetPayload<{ include: typeof pagoInclude }>;

function serializarPago(pago: PagoConRelaciones) {
  return { ...pago, monto: pago.monto.toFixed(2) };
}

export async function listarPagos(db: TenantClient, filtros: ListarPagosQuery) {
  const { desde, hasta, ...resto } = filtros;
  if (desde && hasta && new Date(desde) > new Date(hasta)) {
    throw new AppError(400, "La fecha desde no puede ser posterior a hasta");
  }

  const pagos = await db.pago.findMany({
    where: {
      ...resto,
      ...(desde || hasta
        ? {
            fecha: {
              ...(desde ? { gte: new Date(desde) } : {}),
              ...(hasta ? { lte: new Date(hasta) } : {}),
            },
          }
        : {}),
    },
    include: pagoInclude,
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });

  return pagos.map(serializarPago);
}

export async function obtenerPago(db: TenantClient, id: string) {
  const pago = await db.pago.findUnique({ where: { id }, include: pagoInclude });
  if (!pago) throw new AppError(404, "Pago no encontrado");
  return serializarPago(pago);
}

export async function crearPago(db: TenantClient, input: CrearPagoInput) {
  const socio = await db.socio.findUnique({
    where: { id: input.socioId },
    select: { id: true, gimnasioId: true },
  });
  if (!socio) throw new AppError(404, "Socio no encontrado");

  if (input.membresiaId) {
    const membresia = await db.membresia.findUnique({
      where: { id: input.membresiaId },
      select: { id: true, socioId: true },
    });
    if (!membresia) throw new AppError(404, "Membresía no encontrada");
    if (membresia.socioId !== input.socioId) {
      throw new AppError(400, "La membresía no pertenece al socio indicado");
    }
  }

  const pago = await db.pago.create({
    data: {
      gimnasioId: socio.gimnasioId,
      socioId: input.socioId,
      membresiaId: input.membresiaId ?? null,
      monto: new Prisma.Decimal(input.monto),
      metodoPago: input.metodoPago,
      ...(input.estado ? { estado: input.estado } : {}),
      ...(input.concepto !== undefined ? { concepto: input.concepto } : {}),
      ...(input.fecha ? { fecha: new Date(input.fecha) } : {}),
    },
    include: pagoInclude,
  });
  return serializarPago(pago);
}

export async function actualizarEstadoPago(
  db: TenantClient,
  id: string,
  estado: "PAGADO" | "RECHAZADO"
) {
  const resultado = await db.pago.updateMany({
    where: { id, estado: "PENDIENTE" },
    data: { estado },
  });
  if (resultado.count === 0) {
    const existe = await db.pago.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw new AppError(404, "Pago no encontrado");
    throw new AppError(409, "Solo se puede cambiar el estado de un pago pendiente");
  }

  const actualizado = await db.pago.findUniqueOrThrow({ where: { id }, include: pagoInclude });
  return serializarPago(actualizado);
}
