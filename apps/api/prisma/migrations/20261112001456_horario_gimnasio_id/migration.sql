
ALTER TABLE "horarios" ADD COLUMN     "gimnasioId" TEXT;

UPDATE "horarios" h
SET "gimnasioId" = a."gimnasioId"
FROM "actividades" a
WHERE a."id" = h."actividadId";


ALTER TABLE "horarios" ALTER COLUMN "gimnasioId" SET NOT NULL;


CREATE INDEX "horarios_gimnasioId_idx" ON "horarios"("gimnasioId");


ALTER TABLE "horarios" ADD CONSTRAINT "horarios_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;