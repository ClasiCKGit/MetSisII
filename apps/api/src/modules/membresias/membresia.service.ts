import { AppError } from "../../middlewares/error.middleware";
import type { TenantClient } from "../../config/tenant";
import type {
  InscribirSocioInput,
  ListarMembresiasQuery,
  RenovarMembresiaInput,
} from "./membresia.schema";
import { agregarEstadoVigencia } from "./vigencia";

const membresiaInclude = {
  socio: { select: { id: true, nombre: true, apellido: true } },
  actividad: { select: { id: true, nombre: true } },
  tipoMembresia: { select: { id: true, nombre: true, duracionDias: true } },
} as const;

// El cliente de una transacción interactiva de req.db.$transaction
type Transaccion = Parameters<Parameters<TenantClient["$transaction"]>[0]>[0];

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

/** Socio, actividad y tipo con las mismas reglas para inscribir y para renovar. */
async function validarSocioActividadYTipo(
  tx: Transaccion,
  ids: { socioId: string; actividadId: string; tipoMembresiaId: string }
) {
  const [socio, actividad, tipo] = await Promise.all([
    tx.socio.findUnique({ where: { id: ids.socioId } }),
    tx.actividad.findUnique({ where: { id: ids.actividadId } }),
    tx.tipoMembresia.findUnique({ where: { id: ids.tipoMembresiaId } }),
  ]);

  if (!socio || !socio.activo) throw new AppError(404, "Socio inexistente o inactivo");
  if (!actividad || !actividad.activa) throw new AppError(404, "Actividad inexistente o inactiva");
  if (!tipo || !tipo.activo || tipo.actividadId !== actividad.id) {
    throw new AppError(400, "El tipo de membresía no está activo para esta actividad");
  }
  return { socio, actividad, tipo };
}

/**
 * Rechaza una segunda membresía activa del socio en la actividad que siga vigente en
 * fechaInicio, y que la actividad esté llena en esa fecha. `excluir` deja afuera a la
 * membresía que se está renovando: termina justo cuando empieza la nueva.
 */
async function verificarDisponibilidad(
  tx: Transaccion,
  datos: {
    socioId: string;
    actividad: { id: string; cupo: number | null };
    fechaInicio: Date;
    excluir?: string;
  }
) {
  const { socioId, actividad, fechaInicio, excluir } = datos;
  const sinLaRenovada = excluir ? { id: { not: excluir } } : {};

  const membresiaExistente = await tx.membresia.findFirst({
    where: {
      ...sinLaRenovada,
      socioId,
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
        ...sinLaRenovada,
        actividadId: actividad.id,
        estado: "ACTIVA",
        fechaInicio: { lte: fechaInicio },
        fechaFin: { gte: fechaInicio },
      },
    });
    if (inscriptos >= actividad.cupo) {
      throw new AppError(409, "La actividad no tiene cupo disponible");
    }
  }
}

/** Crea la membresía y su pago pendiente por el precio vigente del tipo. */
async function crearMembresiaConPago(
  tx: Transaccion,
  datos: {
    socio: { id: string; gimnasioId: string };
    actividadId: string;
    tipo: Awaited<ReturnType<typeof validarSocioActividadYTipo>>["tipo"];
    fechaInicio: Date;
    metodoPago: InscribirSocioInput["metodoPago"];
  }
) {
  const { socio, actividadId, tipo, fechaInicio, metodoPago } = datos;
  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + tipo.duracionDias);

  const membresia = await tx.membresia.create({
    data: {
      gimnasioId: socio.gimnasioId,
      socioId: socio.id,
      actividadId,
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
      metodoPago,
    },
  });

  return { membresia, pago };
}

function respuestaConPago({ membresia, pago }: Awaited<ReturnType<typeof crearMembresiaConPago>>) {
  return {
    ...agregarEstadoVigencia(membresia),
    pago: {
      id: pago.id,
      monto: pago.monto.toFixed(2),
      metodoPago: pago.metodoPago,
      estado: pago.estado,
    },
  };
}

export async function inscribir(db: TenantClient, input: InscribirSocioInput) {
  const fechaInicio = input.fechaInicio ? new Date(input.fechaInicio) : new Date();

  // Serializa inscripciones simultáneas para que dos solicitudes no superen el cupo.
  const creada = await db.$transaction(
    async (tx) => {
      const { socio, actividad, tipo } = await validarSocioActividadYTipo(tx, input);
      await verificarDisponibilidad(tx, { socioId: socio.id, actividad, fechaInicio });
      return crearMembresiaConPago(tx, {
        socio,
        actividadId: actividad.id,
        tipo,
        fechaInicio,
        metodoPago: input.metodoPago,
      });
    },
    { isolationLevel: "Serializable" }
  );
  return respuestaConPago(creada);
}

/**
 * Renueva una membresía: crea otra del mismo socio y actividad que empieza cuando termina
 * la actual (o hoy, si ya venció), con su pago pendiente, y marca la actual como renovada.
 * Sin tipoMembresiaId se renueva con el mismo tipo.
 */
export async function renovar(db: TenantClient, id: string, input: RenovarMembresiaInput) {
  const creada = await db.$transaction(
    async (tx) => {
      const actual = await tx.membresia.findUnique({ where: { id } });
      if (!actual) throw new AppError(404, "Membresía no encontrada");
      if (actual.estado === "CANCELADA") {
        throw new AppError(409, "No se puede renovar una membresía cancelada");
      }
      if (actual.renovada) throw new AppError(409, "La membresía ya fue renovada");

      const { socio, actividad, tipo } = await validarSocioActividadYTipo(tx, {
        socioId: actual.socioId,
        actividadId: actual.actividadId,
        tipoMembresiaId: input.tipoMembresiaId ?? actual.tipoMembresiaId,
      });

      // Sin baches ni superposición: arranca cuando termina la actual. Si ya venció, desde hoy.
      const ahora = new Date();
      const fechaInicio = actual.fechaFin > ahora ? actual.fechaFin : ahora;
      await verificarDisponibilidad(tx, {
        socioId: socio.id,
        actividad,
        fechaInicio,
        excluir: actual.id,
      });

      const nueva = await crearMembresiaConPago(tx, {
        socio,
        actividadId: actividad.id,
        tipo,
        fechaInicio,
        metodoPago: input.metodoPago,
      });
      // Ya no hace falta avisarle al socio que la actual vence (ver jobs/recordatorio-vencimiento)
      await tx.membresia.update({
        where: { id: actual.id },
        data: { renovada: true, recordatorioEnviado: true },
      });
      return nueva;
    },
    { isolationLevel: "Serializable" }
  );
  return respuestaConPago(creada);
}

/**
 * Cancela una membresía: deja de dar acceso, libera el cupo y sale de los vencimientos.
 * Sus pagos pendientes pasan a RECHAZADO (no se cobra una membresía cancelada); los pagados
 * no se tocan. Si era la renovación de otra, la anterior vuelve a poder renovarse.
 */
export async function cancelar(db: TenantClient, id: string) {
  const cancelada = await db.$transaction(
    async (tx) => {
      const membresia = await tx.membresia.findUnique({ where: { id } });
      if (!membresia) throw new AppError(404, "Membresía no encontrada");
      if (membresia.estado === "CANCELADA") {
        throw new AppError(409, "La membresía ya está cancelada");
      }

      const pagosRechazados = await tx.pago.updateMany({
        where: { membresiaId: id, estado: "PENDIENTE" },
        data: { estado: "RECHAZADO" },
      });

      // La renovada es la anterior más reciente del socio en la actividad
      const anterior = await tx.membresia.findFirst({
        where: {
          id: { not: id },
          socioId: membresia.socioId,
          actividadId: membresia.actividadId,
          estado: { not: "CANCELADA" },
          renovada: true,
          fechaFin: { lte: membresia.fechaInicio },
        },
        orderBy: { fechaFin: "desc" },
      });
      if (anterior) {
        await tx.membresia.update({ where: { id: anterior.id }, data: { renovada: false } });
      }

      const actualizada = await tx.membresia.update({
        where: { id },
        data: { estado: "CANCELADA" },
        include: membresiaInclude,
      });
      return { actualizada, pagosRechazados: pagosRechazados.count };
    },
    { isolationLevel: "Serializable" }
  );
  return {
    ...agregarEstadoVigencia(cancelada.actualizada),
    pagosRechazados: cancelada.pagosRechazados,
  };
}
