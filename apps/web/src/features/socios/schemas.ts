import { z } from "zod";

const nombre = (campo: string) =>
  z.string().trim().min(1, `Ingresá ${campo}`).max(60, "Es demasiado largo");

export const socioSchema = z.object({
  nombre: nombre("el nombre"),
  apellido: nombre("el apellido"),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos, sin puntos"),
  email: z
    .string()
    .trim()
    .refine((valor) => valor === "" || z.email().safeParse(valor).success, "El email no es válido"),
  telefono: z.string().trim().max(30, "Es demasiado largo"),
  fechaNacimiento: z
    .string()
    .refine(
      (valor) => valor === "" || new Date(valor) <= new Date(),
      "La fecha de nacimiento no puede ser futura"
    ),
});

export type SocioFormValues = z.infer<typeof socioSchema>;

// Lo que espera la API al crear: los opcionales vacíos se omiten
export interface SocioInput {
  nombre: string;
  apellido: string;
  dni: string;
  email?: string;
  telefono?: string;
  fechaNacimiento?: string;
}

// Al editar, null borra un dato opcional (omitirlo lo dejaría como estaba)
export interface SocioCambios {
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string | null;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  activo?: boolean;
}

// La API rechaza los strings vacíos en email y fechaNacimiento, así que se omiten
export function aSocioInput(valores: SocioFormValues): SocioInput {
  return {
    nombre: valores.nombre,
    apellido: valores.apellido,
    dni: valores.dni,
    email: valores.email || undefined,
    telefono: valores.telefono || undefined,
    fechaNacimiento: valores.fechaNacimiento || undefined,
  };
}

// Edición: un campo opcional que quedó vacío se manda como null para borrarlo en la API
export function aSocioCambios(valores: SocioFormValues): SocioCambios {
  return {
    nombre: valores.nombre,
    apellido: valores.apellido,
    dni: valores.dni,
    email: valores.email || null,
    telefono: valores.telefono || null,
    fechaNacimiento: valores.fechaNacimiento || null,
  };
}

// ───── inscripción a una actividad ─────

export const METODOS_PAGO = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MERCADO_PAGO"] as const;

export const inscripcionSchema = z.object({
  actividadId: z.string().min(1, "Elegí una actividad"),
  tipoMembresiaId: z.string().min(1, "Elegí el tipo de membresía"),
  metodoPago: z.enum(METODOS_PAGO, "Elegí cómo va a pagar"),
  fechaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá la fecha de inicio")
    .refine((valor) => !Number.isNaN(Date.parse(valor)), "La fecha no es válida"),
});

export type InscripcionFormValues = z.infer<typeof inscripcionSchema>;

export const renovacionSchema = z.object({
  tipoMembresiaId: z.string().min(1, "Elegí el tipo de membresía"),
  metodoPago: z.enum(METODOS_PAGO, "Elegí cómo va a pagar"),
});

export type RenovacionFormValues = z.infer<typeof renovacionSchema>;

// La vigencia se cuenta en días UTC (igual que en la API): el día elegido va a medianoche UTC
export function aFechaInicioIso(fecha: string): string {
  return `${fecha}T00:00:00.000Z`;
}
