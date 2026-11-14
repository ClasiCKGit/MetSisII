// Una actividad tal como la devuelve GET /api/actividades
export interface Actividad {
  id: string;
  gimnasioId: string;
  nombre: string;
  descripcion: string | null;
  cupo: number | null;
  activa: boolean;
}
