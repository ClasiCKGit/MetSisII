-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'RECEPCIONISTA');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "EstadoMembresia" AS ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MERCADO_PAGO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "gimnasios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gimnasios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "gimnasioId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'RECEPCIONISTA',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socios" (
    "id" TEXT NOT NULL,
    "gimnasioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "socios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profesores" (
    "id" TEXT NOT NULL,
    "gimnasioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "especialidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profesores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades" (
    "id" TEXT NOT NULL,
    "gimnasioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cupo" INTEGER,
    "profesorId" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios" (
    "id" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,

    CONSTRAINT "horarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_membresia" (
    "id" TEXT NOT NULL,
    "gimnasioId" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "duracionDias" INTEGER NOT NULL,
    "cantidadClases" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_membresia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membresias" (
    "id" TEXT NOT NULL,
    "gimnasioId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "tipoMembresiaId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoMembresia" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membresias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "gimnasioId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "membresiaId" TEXT,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" "MetodoPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "concepto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gimnasios_slug_key" ON "gimnasios"("slug");

-- CreateIndex
CREATE INDEX "usuarios_gimnasioId_idx" ON "usuarios"("gimnasioId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_gimnasioId_email_key" ON "usuarios"("gimnasioId", "email");

-- CreateIndex
CREATE INDEX "socios_gimnasioId_idx" ON "socios"("gimnasioId");

-- CreateIndex
CREATE UNIQUE INDEX "socios_gimnasioId_dni_key" ON "socios"("gimnasioId", "dni");

-- CreateIndex
CREATE INDEX "profesores_gimnasioId_idx" ON "profesores"("gimnasioId");

-- CreateIndex
CREATE INDEX "actividades_gimnasioId_idx" ON "actividades"("gimnasioId");

-- CreateIndex
CREATE INDEX "horarios_actividadId_idx" ON "horarios"("actividadId");

-- CreateIndex
CREATE INDEX "tipos_membresia_gimnasioId_idx" ON "tipos_membresia"("gimnasioId");

-- CreateIndex
CREATE INDEX "tipos_membresia_actividadId_idx" ON "tipos_membresia"("actividadId");

-- CreateIndex
CREATE INDEX "membresias_gimnasioId_idx" ON "membresias"("gimnasioId");

-- CreateIndex
CREATE INDEX "membresias_socioId_actividadId_idx" ON "membresias"("socioId", "actividadId");

-- CreateIndex
CREATE INDEX "pagos_gimnasioId_idx" ON "pagos"("gimnasioId");

-- CreateIndex
CREATE INDEX "pagos_socioId_idx" ON "pagos"("socioId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "socios" ADD CONSTRAINT "socios_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesores" ADD CONSTRAINT "profesores_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "profesores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_membresia" ADD CONSTRAINT "tipos_membresia_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_membresia" ADD CONSTRAINT "tipos_membresia_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_tipoMembresiaId_fkey" FOREIGN KEY ("tipoMembresiaId") REFERENCES "tipos_membresia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_gimnasioId_fkey" FOREIGN KEY ("gimnasioId") REFERENCES "gimnasios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "membresias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
