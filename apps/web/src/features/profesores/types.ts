export interface Profesor {
  id: string;
  gimnasioId: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  activo: boolean;
}
