import type { TenantClient } from "../../config/tenant";
import { AppError } from "../../middlewares/error.middleware";
import type { AuthContext } from "../auth/auth.types";
import type { ActualizarGimnasioInput } from "./gimnasio.schema";

// Solo lo que la pantalla necesita: ni activo ni fechas internas
const datosPublicos = {
  id: true,
  nombre: true,
  slug: true,
  email: true,
  telefono: true,
  direccion: true,
} as const;

// req.db solo deja leer y actualizar el propio gimnasio (TENANT_RULES): aunque se pidiera
// otro id, la extensión agrega la condición del gimnasio de la sesión
export async function obtener(db: TenantClient, actor: AuthContext) {
  const gimnasio = await db.gimnasio.findUnique({
    where: { id: actor.gimnasioId },
    select: datosPublicos,
  });
  if (!gimnasio) throw new AppError(404, "Gimnasio no encontrado");
  return gimnasio;
}

export function actualizar(db: TenantClient, actor: AuthContext, input: ActualizarGimnasioInput) {
  return db.gimnasio.update({
    where: { id: actor.gimnasioId },
    data: input,
    select: datosPublicos,
  });
}
