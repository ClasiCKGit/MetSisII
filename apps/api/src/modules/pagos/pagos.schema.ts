import { z } from "zod";

const montoSchema = z
  .union([
    z
      .string()
      .trim()
      .regex(/^\d{1,8}(?:\.\d{1,2})?$/, "El monto debe tener hasta 2 decimales"),
    z.number().finite().nonnegative(),
  ])
  .transform((monto) => String(monto))
  .refine(
    (monto) => /^\d{1,8}(?:\.\d{1,2})?$/.test(monto),
    "El monto debe ser positivo y tener hasta 2 decimales"
  )
  .refine((monto) => Number(monto) > 0, "El monto debe ser mayor a cero")
  .refine((monto) => Number(monto) <= 99_999_999.99, "El monto supera el máximo permitido");

export const crearPagoSchema = z.object({
  socioId: z.uuid("Id de socio inválido"),
  membresiaId: z.uuid("Id de membresía inválido").nullable().optional(),
  monto: montoSchema,
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MERCADO_PAGO"]),
  estado: z.enum(["PENDIENTE", "PAGADO", "RECHAZADO"]).optional(),
  concepto: z.string().trim().min(1).max(200).nullable().optional(),
  fecha: z.iso.datetime().optional(),
});

export const actualizarEstadoPagoSchema = z.strictObject({
  estado: z.enum(["PAGADO", "RECHAZADO"]),
});

export const listarPagosQuerySchema = z.object({
  socioId: z.uuid().optional(),
  membresiaId: z.uuid().optional(),
  estado: z.enum(["PENDIENTE", "PAGADO", "RECHAZADO"]).optional(),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MERCADO_PAGO"]).optional(),
  desde: z.iso.datetime().optional(),
  hasta: z.iso.datetime().optional(),
});

export const pagoIdParamSchema = z.object({ id: z.uuid("Id de pago inválido") });

export type CrearPagoInput = z.infer<typeof crearPagoSchema>;
export type ListarPagosQuery = z.infer<typeof listarPagosQuerySchema>;
