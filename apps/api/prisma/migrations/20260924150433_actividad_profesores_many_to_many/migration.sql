/*
  Warnings:

  - You are about to drop the column `profesorId` on the `actividades` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "actividades" DROP CONSTRAINT "actividades_profesorId_fkey";

-- AlterTable
ALTER TABLE "actividades" DROP COLUMN "profesorId";

-- AlterTable
ALTER TABLE "horarios" ADD COLUMN     "actividadProfesorId" TEXT;

-- CreateTable
CREATE TABLE "actividad_profesores" (
    "id" TEXT NOT NULL,
    "gimnasioId" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividad_profesores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actividad_profesores_gimnasioId_idx" ON "actividad_profesores"("gimnasioId");

-- CreateIndex
CREATE UNIQUE INDEX "actividad_profesores_actividadId_profesorId_key" ON "actividad_profesores"("actividadId", "profesorId");

-- AddForeignKey
ALTER TABLE "actividad_profesores" ADD CONSTRAINT "actividad_profesores_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_profesores" ADD CONSTRAINT "actividad_profesores_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_profesores" ADD CONSTRAINT "actividad_profesores_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "profesores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_actividadProfesorId_fkey" FOREIGN KEY ("actividadProfesorId") REFERENCES "actividad_profesores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
