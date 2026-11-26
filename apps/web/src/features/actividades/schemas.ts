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
