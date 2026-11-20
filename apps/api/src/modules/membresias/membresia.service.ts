import { AppError } from "../../middlewares/error.middleware";
import type { TenantClient } from "../../config/tenant";
import type { InscribirSocioInput } from "./membresia.schema";

export async function inscribir(db: TenantClient, input: InscribirSocioInput) {
  const fechaInicio = input.fechaInicio ? new Date(input.fechaInicio) : new Date();

  // Serializa inscripciones simultáneas para que dos solicitudes no superen el cupo.
  return db.$transaction(
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

      return tx.membresia.create({
        data: {
          gimnasioId: socio.gimnasioId,
          socioId: socio.id,
          actividadId: actividad.id,
          tipoMembresiaId: tipo.id,
          fechaInicio,
          fechaFin,
        },
        include: {
          socio: { select: { id: true, nombre: true, apellido: true } },
          actividad: { select: { id: true, nombre: true } },
          tipoMembresia: { select: { id: true, nombre: true } },
        },
      });
    },
    { isolationLevel: "Serializable" }
  );
}
