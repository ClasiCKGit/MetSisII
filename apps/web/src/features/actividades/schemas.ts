import { z } from "zod";
import { DIAS_SEMANA } from "./types";

const nombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el nombre")
  .max(80, "El nombre es demasiado largo");

const descripcionSchema = z.string().trim().max(500, "La descripción es demasiado larga");

const cupoSchema = z
  .string()
  .trim()
  .refine(
    (valor) => valor === "" || (/^\d{1,6}$/.test(valor) && Number(valor) > 0),
    "El cupo debe ser un número entero mayor a 0"
  );

export const actividadSchema = z.object({
  nombre: nombreSchema,
  descripcion: descripcionSchema,
  cupo: cupoSchema,
});

export type ActividadInput = z.infer<typeof actividadSchema>;

export function aPayload(valores: ActividadInput) {
  return {
    nombre: valores.nombre,
    descripcion: valores.descripcion || null,
    cupo: valores.cupo ? Number(valores.cupo) : null,
  };
}

export type ActividadPayload = ReturnType<typeof aPayload>;

// ───── horarios

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const horaSchema = z.string().trim().regex(HORA, "Usá el formato HH:MM, por ejemplo 08:30 o 18:00");

export const horarioSchema = z
  .object({
    diaSemana: z.enum(DIAS_SEMANA, "Indicá el día de la semana"),
    horaInicio: horaSchema,
    horaFin: horaSchema,
    // "" = sin profesor; si no, el id de la asignación profesor-actividad
    actividadProfesorId: z.string(),
  })
  // Con HH:MM y ceros a la izquierda, comparar como texto es comparar como hora (igual que la API)
  .refine((h) => !HORA.test(h.horaInicio) || !HORA.test(h.horaFin) || h.horaInicio < h.horaFin, {
    message: "Tiene que terminar después de empezar",
    path: ["horaFin"],
  });

export type HorarioInput = z.input<typeof horarioSchema>;

export function aPayloadDeHorario(valores: z.output<typeof horarioSchema>) {
  return {
    diaSemana: valores.diaSemana,
    horaInicio: valores.horaInicio,
    horaFin: valores.horaFin,
    actividadProfesorId: valores.actividadProfesorId || null,
  };
}

export type HorarioPayload = ReturnType<typeof aPayloadDeHorario>;

// ───── tipos de membresía (planes y precios)

export const tipoMembresiaSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre").max(100, "El nombre es demasiado largo"),
  // Se acepta coma o punto decimal: "12500,50" o "12500.50". Hasta 8 enteros y 2 decimales,
  // como la columna Decimal(10, 2) de la API.
  precio: z
    .string()
    .trim()
    .regex(/^\d{1,8}([.,]\d{1,2})?$/, "Ingresá un precio válido, por ejemplo 12500 o 12500,50"),
  duracionDias: z
    .string()
    .trim()
    .refine(
      (valor) => /^\d{1,4}$/.test(valor) && Number(valor) > 0,
      "La duración debe ser una cantidad de días mayor a 0"
    ),
  // Vacío = clases ilimitadas dentro del período
  cantidadClases: z
    .string()
    .trim()
    .refine(
      (valor) => valor === "" || (/^\d{1,4}$/.test(valor) && Number(valor) > 0),
      "La cantidad de clases debe ser un número mayor a 0"
    ),
});

export type TipoMembresiaInput = z.infer<typeof tipoMembresiaSchema>;

export function aPayloadDeTipo(valores: TipoMembresiaInput) {
  return {
    nombre: valores.nombre,
    precio: Number(valores.precio.replace(",", ".")),
    duracionDias: Number(valores.duracionDias),
    cantidadClases: valores.cantidadClases ? Number(valores.cantidadClases) : null,
  };
}

export type TipoMembresiaPayload = ReturnType<typeof aPayloadDeTipo>;
