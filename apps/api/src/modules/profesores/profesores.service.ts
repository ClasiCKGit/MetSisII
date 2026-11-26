import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthContext } from "../auth/auth.types";
import type { ActualizarProfesorInput, CrearProfesorInput } from "./profesores.schema";

export function listar(db: TenantClient) {
  return db.profesor.findMany({ orderBy: [{ apellido: "asc" }, { nombre: "asc" }] });
}

export async function obtener(db: TenantClient, id: string) {
  const profesor = await db.profesor.findUnique({ where: { id } });
  if (!profesor) {
    throw new AppError(404, "Profesor no encontrado");
  }
  return profesor;
}

export function crear(db: TenantClient, actor: AuthContext, input: CrearProfesorInput) {
  return db.profesor.create({ data: { ...input, gimnasioId: actor.gimnasioId } });
}

export async function actualizar(db: TenantClient, id: string, input: ActualizarProfesorInput) {
  await obtener(db, id); // 404 claro si no existe o si es de otro gimnasio
  return db.profesor.update({ where: { id }, data: input });
}
