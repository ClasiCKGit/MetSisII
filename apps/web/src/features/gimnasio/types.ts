// Respuesta de GET /api/gimnasio
export interface DatosGimnasio {
  id: string;
  nombre: string;
  // Identificador del login: no se puede cambiar
  slug: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}
