// Un socio tal como lo devuelve GET /api/socios
export interface Socio {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  fechaIngreso: string;
  activo: boolean;
  createdAt: string;
}

export type FiltroEstado = "todos" | "activos" | "inactivos";
