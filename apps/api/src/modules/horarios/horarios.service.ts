import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthContext } from "../auth/auth.types";
import type { ActualizarHorarioInput, CrearHorarioInput } from "./horarios.schema";

export function listar(db: TenantClient, filtros: { actividadId?: string }) {
  return db.horario.findMany({
    where: filtros.actividadId ? { actividadId: filtros.actividadId } : {},
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });
}

export async function obtener(db: TenantClient, id: string) {
  const horario = await db.horario.findUnique({ where: { id } });
  if (!horario) {
    throw new AppError(404, "Horario no encontrado");
  }
  return horario;
}

async function verificarVinculo(db: TenantClient, vinculoId: string) {
  const vinculo = await db.actividadProfesor.findUnique({ where: { id: vinculoId } });
  if (!vinculo) {
    throw new AppError(404, "La asignación de profesor no existe");
  }
}

export async function crear(db: TenantClient, actor: AuthContext, input: CrearHorarioInput) {
  const actividad = await db.actividad.findUnique({ where: { id: input.actividadId } });
  if (!actividad) {
    throw new AppError(404, "Actividad no encontrada");
  }
  if (input.actividadProfesorId) {
    await verificarVinculo(db, input.actividadProfesorId);
  }
  if (!actividad.activa) {
    throw new AppError(409, "La actividad está dada de baja");
  }

  return db.horario.create({ data: { ...input, gimnasioId: actor.gimnasioId } });
}

export async function actualizar(db: TenantClient, id: string, input: ActualizarHorarioInput) {
  const actual = await obtener(db, id);

  const horaInicio = input.horaInicio ?? actual.horaInicio;
  const horaFin = input.horaFin ?? actual.horaFin;
  if (horaInicio >= horaFin) {
    throw new AppError(400, "La hora de inicio debe ser anterior a la de fin");
  }

  if (input.actividadProfesorId) {
    await verificarVinculo(db, input.actividadProfesorId);
  }

  return db.horario.update({ where: { id }, data: input });
}

export async function eliminar(db: TenantClient, id: string) {
  await obtener(db, id);
  await db.horario.delete({ where: { id } });
}
