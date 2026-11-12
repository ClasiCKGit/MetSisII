import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthContext } from "../auth/auth.types";
import type { ActualizarActividadInput, CrearActividadInput } from "./actividades.schema";

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
  await obtener(db, id); // 404 claro si no existe o si es de otro gimnasio
  return db.actividad.update({ where: { id }, data: input });
}
