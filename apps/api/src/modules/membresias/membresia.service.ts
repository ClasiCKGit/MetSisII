import { AppError } from "../../middlewares/error.middleware";
import type { TenantClient } from "../../config/tenant";
import type { InscribirSocioInput, ListarMembresiasQuery } from "./membresia.schema";
import { agregarEstadoVigencia } from "./vigencia";

const membresiaInclude = {
  socio: { select: { id: true, nombre: true, apellido: true } },
  actividad: { select: { id: true, nombre: true } },
  tipoMembresia: { select: { id: true, nombre: true, duracionDias: true } },
} as const;

export async function listar(db: TenantClient, filtros: ListarMembresiasQuery) {
  const { vigencia, ...where } = filtros;
  const membresias = await db.membresia.findMany({
    where,
    include: membresiaInclude,
    orderBy: [{ fechaFin: "asc" }, { createdAt: "desc" }],
  });
  const conVigencia = membresias.map(agregarEstadoVigencia);
  return vigencia
    ? conVigencia.filter((membresia) => membresia.estadoVigencia === vigencia)
    : conVigencia;
}

export async function obtener(db: TenantClient, id: string) {
  const membresia = await db.membresia.findUnique({ where: { id }, include: membresiaInclude });
  if (!membresia) throw new AppError(404, "Membresía no encontrada");
  return agregarEstadoVigencia(membresia);
}

export async function inscribir(db: TenantClient, input: InscribirSocioInput) {
  const fechaInicio = input.fechaInicio ? new Date(input.fechaInicio) : new Date();

  // Serializa inscripciones simultáneas para que dos solicitudes no superen el cupo.
  const membresia = await db.$transaction(
    async (tx) => {
      const [socio, actividad, tipo] = await Promise.all([
        tx.socio.findUnique({ where: { id: input.socioId } }),
        tx.actividad.findUnique({ where: { id: input.actividadId } }),
        tx.tipoMembresia.findUnique({ where: { id: input.tipoMembresiaId } }),
      ]);

      if (!socio || !socio.activo) throw new AppError(404, "Socio inexistente o inactivo");
      if (!actividad || !actividad.activa)
        throw new AppError(404, "Actividad inexistente o inactiva");
      if (!tipo || !tipo.activo || tipo.actividadId !== actividad.id) {
        throw new AppError(400, "El tipo de membresía no está activo para esta actividad");
      }

      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + tipo.duracionDias);

      const membresiaExistente = await tx.membresia.findFirst({
        where: {
          socioId: socio.id,
          actividadId: actividad.id,
          estado: "ACTIVA",
          fechaFin: { gte: fechaInicio },
        },
      });
      if (membresiaExistente) {
        throw new AppError(409, "El socio ya tiene una membresía activa para esta actividad");
      }

      if (actividad.cupo !== null) {
        const inscriptos = await tx.membresia.count({
          where: {
            actividadId: actividad.id,
            estado: "ACTIVA",
            fechaInicio: { lte: fechaInicio },
            fechaFin: { gte: fechaInicio },
          },
        });
        if (inscriptos >= actividad.cupo)
          throw new AppError(409, "La actividad no tiene cupo disponible");
      }

      const membresia = await tx.membresia.create({
        data: {
          gimnasioId: socio.gimnasioId,
          socioId: socio.id,
          actividadId: actividad.id,
          tipoMembresiaId: tipo.id,
          fechaInicio,
          fechaFin,
        },
        include: membresiaInclude,
      });

      const pago = await tx.pago.create({
        data: {
          gimnasioId: socio.gimnasioId,
          socioId: socio.id,
          membresiaId: membresia.id,
          monto: tipo.precio,
          metodoPago: input.metodoPago,
        },
      });

      return { membresia, pago };
    },
    { isolationLevel: "Serializable" }
  );
  return {
    ...agregarEstadoVigencia(membresia.membresia),
    pago: {
      id: membresia.pago.id,
      monto: membresia.pago.monto.toFixed(2),
      metodoPago: membresia.pago.metodoPago,
      estado: membresia.pago.estado,
    },
  };
}
