-- Migración de datos (sin cambios de schema). Una membresía es "renovada" cuando el socio ya
-- tiene la siguiente en la misma actividad. Hasta ahora solo lo marcaba la renovación; desde
-- esta versión también lo marca una inscripción nueva después de que la anterior terminó.
-- Acá se marcan las que ya estaban en esa situación, para que no figuren como vencidas sin renovar.
UPDATE "membresias" AS anterior
SET "renovada" = true
WHERE anterior."estado" <> 'CANCELADA'
  AND anterior."renovada" = false
  AND EXISTS (
    SELECT 1
    FROM "membresias" AS siguiente
    WHERE siguiente."gimnasioId" = anterior."gimnasioId"
      AND siguiente."socioId" = anterior."socioId"
      AND siguiente."actividadId" = anterior."actividadId"
      AND siguiente."id" <> anterior."id"
      AND siguiente."estado" <> 'CANCELADA'
      AND siguiente."fechaInicio" >= anterior."fechaFin"
  );
