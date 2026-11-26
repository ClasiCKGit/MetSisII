// Lo que devuelve GET /api/dashboard/resumen
export interface ResumenDashboard {
  sociosActivos: number;
  /** Pagos PAGADO del mes en curso, como texto decimal ("1500.75") */
  ingresosMes: string;
  /** Membresías que vencen hoy o en los próximos 7 días */
  vencimientosProximos: number;
}
