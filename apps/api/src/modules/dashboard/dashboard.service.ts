import type { TenantClient } from "../../config/tenant";
import type { ResumenDashboard } from "./dashboard.types";

// db es el cliente del gimnasio (req.db): el conteo nunca incluye socios de otro gimnasio
export async function obtenerResumen(db: TenantClient): Promise<ResumenDashboard> {
  const sociosActivos = await db.socio.count({ where: { activo: true } });
  return { sociosActivos };
}
