import { env } from "../../config/env";
import type { TenantClient } from "../../config/tenant";
import { rangoDelMes } from "../../utils/fechas";
import { rangoPorVencer } from "../membresias/vigencia";
import type { ResumenDashboard } from "./dashboard.types";

// db es el cliente del gimnasio (req.db): ninguna métrica incluye datos de otro gimnasio
export async function obtenerResumen(
  db: TenantClient,
  ahora = new Date()
): Promise<ResumenDashboard> {
  const mes = rangoDelMes(ahora, env.ZONA_HORARIA);
  const porVencer = rangoPorVencer(ahora);

  const [sociosActivos, ingresos, vencimientosProximos] = await Promise.all([
    db.socio.count({ where: { activo: true } }),
    db.pago.aggregate({
      _sum: { monto: true },
      where: { estado: "PAGADO", fecha: { gte: mes.desde, lt: mes.hasta } },
    }),
    db.membresia.count({
      where: {
        estado: { not: "CANCELADA" },
        fechaFin: { gte: porVencer.desde, lt: porVencer.hasta },
      },
    }),
  ]);

  return {
    sociosActivos,
    ingresosMes: (ingresos._sum.monto ?? 0).toFixed(2),
    vencimientosProximos,
  };
}
