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

export const DIAS_SEMANA = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

export interface Horario {
  id: string;
  gimnasioId: string;
  actividadId: string;
  diaSemana: DiaSemana;
  // "HH:MM" en 24 horas
  horaInicio: string;
  horaFin: string;
  // Id de la asignación profesor-actividad (no del profesor), o null si no tiene profesor
  actividadProfesorId: string | null;
}
