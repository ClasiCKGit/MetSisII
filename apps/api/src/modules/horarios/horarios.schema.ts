import { z } from "zod";

const diaSemanaSchema = z.enum(
  ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"],
  "El día de la semana no es válido"
);

// "HH:MM" en 24 horas, con ceros a la izquierda: 08:30, 19:00
const horaSchema = z
  .string("La hora es obligatoria")
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:MM (por ejemplo 08:30)");

// null significa "sin profesor asignado"
const vinculoSchema = z.uuid("El id del vínculo no es válido").nullable().optional();

export const crearHorarioSchema = z
  .object({
    actividadId: z.uuid("El id de la actividad no es válido"),
    diaSemana: diaSemanaSchema,
    horaInicio: horaSchema,
    horaFin: horaSchema,
    actividadProfesorId: vinculoSchema,
  })
  .refine((h) => h.horaInicio < h.horaFin, {
    message: "La hora de inicio debe ser anterior a la de fin",
    path: ["horaFin"],
  });

// strictObject: no incluye actividadId a propósito. Un horario no cambia de actividad,
// y mandarlo (o cualquier otro campo de más) se rechaza con 400.
export const actualizarHorarioSchema = z
  .strictObject({
    diaSemana: diaSemanaSchema.optional(),
    horaInicio: horaSchema.optional(),
    horaFin: horaSchema.optional(),
    actividadProfesorId: vinculoSchema,
  })
  .refine((datos) => Object.keys(datos).length > 0, "Indicá al menos un campo para actualizar");

export const listarHorariosQuerySchema = z.object({
  actividadId: z.uuid("El id de la actividad no es válido").optional(),
});

export const idParamsSchema = z.object({
  id: z.uuid("El id no es válido"),
});

export type CrearHorarioInput = z.infer<typeof crearHorarioSchema>;
export type ActualizarHorarioInput = z.infer<typeof actualizarHorarioSchema>;
