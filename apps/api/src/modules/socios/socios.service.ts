import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthContext } from "../auth/auth.types";
import type { CreateSocioInput, ListSociosQuery, UpdateSocioInput } from "./socios.schema";

const SOCIO_NO_ENCONTRADO = "Socio no encontrado";
const DNI_DUPLICADO = "Ya existe un socio con ese DNI en este gimnasio";

// Prisma identifica sus errores con un código: P2002 = restricción única violada,
// P2025 = el registro a modificar no existe.
function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return undefined;
}

export async function listSocios(db: TenantClient, { q, activo }: ListSociosQuery) {
  return db.socio.findMany({
    where: {
      ...(activo !== undefined ? { activo } : {}),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" as const } },
              { apellido: { contains: q, mode: "insensitive" as const } },
              { dni: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });
}

export async function getSocio(db: TenantClient, id: string) {
  const socio = await db.socio.findUnique({ where: { id } });
  if (!socio) {
    throw new AppError(404, SOCIO_NO_ENCONTRADO);
  }
  return socio;
}

export async function createSocio(db: TenantClient, actor: AuthContext, input: CreateSocioInput) {
  try {
    return await db.socio.create({ data: { ...input, gimnasioId: actor.gimnasioId } });
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") {
      throw new AppError(409, DNI_DUPLICADO);
    }
    throw error;
  }
}

export async function updateSocio(db: TenantClient, id: string, input: UpdateSocioInput) {
  try {
    return await db.socio.update({ where: { id }, data: input });
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2002") {
      throw new AppError(409, DNI_DUPLICADO);
    }
    if (code === "P2025") {
      throw new AppError(404, SOCIO_NO_ENCONTRADO);
    }
    throw error;
  }
}

// Baja lógica: se marca como inactivo en vez de borrar la fila.
export async function deactivateSocio(db: TenantClient, id: string) {
  return updateSocio(db, id, { activo: false });
}
