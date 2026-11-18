import { AppError } from "../../middlewares/error.middleware";
import type { TenantClient } from "../../config/tenant";
import type {
  ActualizarTipoMembresiaInput,
  CrearTipoMembresiaInput,
} from "./tipo-membresia.schema";

async function verificarActividad(gimnasioDb: TenantClient, actividadId: string) {
  const actividad = await gimnasioDb.actividad.findUnique({ where: { id: actividadId } });
  if (!actividad) throw new AppError(404, "La actividad no existe");
}

export async function listar(db: Express.Request["db"], actividadId?: string) {
  return db.tipoMembresia.findMany({
    where: actividadId ? { actividadId } : undefined,
    include: { actividad: { select: { id: true, nombre: true } } },
    orderBy: [{ actividad: { nombre: "asc" } }, { nombre: "asc" }],
  });
}

export async function obtener(db: Express.Request["db"], id: string) {
  const tipo = await db.tipoMembresia.findUnique({
    where: { id },
    include: { actividad: { select: { id: true, nombre: true } } },
  });
  if (!tipo) throw new AppError(404, "Tipo de membresía no encontrado");
  return tipo;
}

export async function crear(db: Express.Request["db"], input: CrearTipoMembresiaInput) {
  await verificarActividad(db, input.actividadId);
  return db.tipoMembresia.create({
    data: input,
    include: { actividad: { select: { id: true, nombre: true } } },
  });
}

export async function actualizar(
  db: Express.Request["db"],
  id: string,
  input: ActualizarTipoMembresiaInput
) {
  const actual = await db.tipoMembresia.findUnique({ where: { id } });
  if (!actual) throw new AppError(404, "Tipo de membresía no encontrado");
  if (input.actividadId) await verificarActividad(db, input.actividadId);
  return db.tipoMembresia.update({
    where: { id },
    data: input,
    include: { actividad: { select: { id: true, nombre: true } } },
  });
}

// Se conserva el registro para no romper membresías históricas que lo referencian.
export async function eliminar(db: Express.Request["db"], id: string) {
  const actual = await db.tipoMembresia.findUnique({ where: { id } });
  if (!actual) throw new AppError(404, "Tipo de membresía no encontrado");
  return db.tipoMembresia.update({ where: { id }, data: { activo: false } });
}
