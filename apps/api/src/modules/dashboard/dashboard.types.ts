// Métricas del inicio
export interface ResumenDashboard {
  sociosActivos: number;
  /** Suma de los pagos PAGADO del mes calendario en curso (en ZONA_HORARIA), con 2 decimales */
  ingresosMes: string;
  /** Membresías no canceladas que vencen hoy o en los próximos 7 días (vigencia POR_VENCER) */
  vencimientosProximos: number;
}
