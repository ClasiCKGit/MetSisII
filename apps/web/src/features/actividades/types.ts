import type { Profesor } from "@/features/profesores/types";

export interface Actividad {
  id: string;
  gimnasioId: string;
  nombre: string;
  descripcion: string | null;
  cupo: number | null;
  activa: boolean;
}

export interface VinculoProfesor {
  id: string;
  actividadId: string;
  profesorId: string;
  profesor: Profesor;
}
