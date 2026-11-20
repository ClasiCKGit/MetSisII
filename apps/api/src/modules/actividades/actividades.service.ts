import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthContext } from "../auth/auth.types";
import type {
  ActualizarActividadInput,
  CrearActividadInput,
  VincularProfesorInput,
} from "./actividades.schema";

export function listar(db: TenantClient) {
  return db.actividad.findMany({ orderBy: { nombre: "asc" } });
}

export async function obtener(db: TenantClient, id: string) {
  const actividad = await db.actividad.findUnique({ where: { id } });
  if (!actividad) {
    throw new AppError(404, "Actividad no encontrada");
  }
  return actividad;
}

export function crear(db: TenantClient, actor: AuthContext, input: CrearActividadInput) {
  return db.actividad.create({ data: { ...input, gimnasioId: actor.gimnasioId } });
}

export async function actualizar(db: TenantClient, id: string, input: ActualizarActividadInput) {
  await obtener(db, id);
  return db.actividad.update({ where: { id }, data: input });
}

export async function listarProfesores(db: TenantClient, actividadId: string) {
  await obtener(db, actividadId);
  return db.actividadProfesor.findMany({
    where: { actividadId },
    include: { profesor: true },
    orderBy: [{ profesor: { apellido: "asc" } }, { profesor: { nombre: "asc" } }],
  });
}

export async function vincularProfesor(
  db: TenantClient,
  actor: AuthContext,
  actividadId: string,
  { profesorId }: VincularProfesorInput
) {
  const actividad = await obtener(db, actividadId);
  const profesor = await db.profesor.findUnique({ where: { id: profesorId } });
  if (!profesor) {
    throw new AppError(404, "Profesor no encontrado");
  }
  if (!actividad.activa) {
    throw new AppError(409, "La actividad está dada de baja");
  }
  if (!profesor.activo) {
    throw new AppError(409, "El profesor está dado de baja");
  }

  const existente = await db.actividadProfesor.findFirst({ where: { actividadId, profesorId } });
  if (existente) {
    throw new AppError(409, "El profesor ya está asignado a esta actividad");
  }

  return db.actividadProfesor.create({
    data: { gimnasioId: actor.gimnasioId, actividadId, profesorId },
    include: { profesor: true },
  });
}

export async function desvincularProfesor(
  db: TenantClient,
  actividadId: string,
  profesorId: string
) {
  const vinculo = await db.actividadProfesor.findFirst({ where: { actividadId, profesorId } });
  if (!vinculo) {
    throw new AppError(404, "El profesor no está asignado a esta actividad");
  }
  await db.actividadProfesor.delete({ where: { id: vinculo.id } });
}
