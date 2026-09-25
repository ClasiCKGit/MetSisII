// apps/api/prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Limpieza en orden (respetando FKs)
  await prisma.pago.deleteMany();
  await prisma.membresia.deleteMany();
  await prisma.tipoMembresia.deleteMany();
  await prisma.horario.deleteMany();
  await prisma.actividadProfesor.deleteMany();
  await prisma.actividad.deleteMany();
  await prisma.profesor.deleteMany();
  await prisma.socio.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.gimnasio.deleteMany();

  const gimnasio = await prisma.gimnasio.create({
    data: {
      nombre: "FitZone Bahía Blanca",
      slug: "fitzone-bahia-blanca",
      email: "contacto@fitzone.com",
      telefono: "291-1234567",
      direccion: "Av. Colón 123, Bahía Blanca",
    },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.usuario.create({
    data: {
      gimnasioId: gimnasio.id,
      email: "admin@fitzone.com",
      passwordHash,
      nombre: "Ana",
      apellido: "Administradora",
      rol: "ADMIN",
    },
  });

  const profeMusculacion1 = await prisma.profesor.create({
    data: {
      gimnasioId: gimnasio.id,
      nombre: "Carlos",
      apellido: "Gómez",
      especialidad: "Musculación",
      telefono: "291-1112222",
    },
  });

  const profeMusculacion2 = await prisma.profesor.create({
    data: {
      gimnasioId: gimnasio.id,
      nombre: "Diego",
      apellido: "Torres",
      especialidad: "Musculación y funcional",
      telefono: "291-9990000",
    },
  });

  const musculacion = await prisma.actividad.create({
    data: {
      gimnasioId: gimnasio.id,
      nombre: "Musculación",
      descripcion: "Sala de musculación libre con asesoramiento",
      cupo: 30,
    },
  });

  // vinculamos ambos profesores a la actividad
  const vinculoCarlos = await prisma.actividadProfesor.create({
    data: {
      gimnasioId: gimnasio.id,
      actividadId: musculacion.id,
      profesorId: profeMusculacion1.id,
    },
  });
  const vinculoDiego = await prisma.actividadProfesor.create({
    data: {
      gimnasioId: gimnasio.id,
      actividadId: musculacion.id,
      profesorId: profeMusculacion2.id,
    },
  });

  await prisma.horario.createMany({
    data: [
      {
        actividadId: musculacion.id,
        diaSemana: "LUNES",
        horaInicio: "08:00",
        horaFin: "22:00",
        actividadProfesorId: vinculoCarlos.id,
      },
      {
        actividadId: musculacion.id,
        diaSemana: "MIERCOLES",
        horaInicio: "08:00",
        horaFin: "22:00",
        actividadProfesorId: vinculoCarlos.id,
      },
      {
        actividadId: musculacion.id,
        diaSemana: "VIERNES",
        horaInicio: "08:00",
        horaFin: "22:00",
        actividadProfesorId: vinculoDiego.id,
      },
      { actividadId: musculacion.id, diaSemana: "SABADO", horaInicio: "09:00", horaFin: "13:00" }, // sin profesor fijo asignado
    ],
  });

  const profeJiuJitsu = await prisma.profesor.create({
    data: {
      gimnasioId: gimnasio.id,
      nombre: "Marina",
      apellido: "Silva",
      especialidad: "Jiu-Jitsu",
      telefono: "291-3334444",
    },
  });

  const jiujitsu = await prisma.actividad.create({
    data: {
      gimnasioId: gimnasio.id,
      nombre: "Jiu-Jitsu",
      descripcion: "Clases de Jiu-Jitsu para todos los niveles",
      cupo: 20,
    },
  });

  const vinculoMarina = await prisma.actividadProfesor.create({
    data: { gimnasioId: gimnasio.id, actividadId: jiujitsu.id, profesorId: profeJiuJitsu.id },
  });

  await prisma.horario.createMany({
    data: [
      {
        actividadId: jiujitsu.id,
        diaSemana: "MARTES",
        horaInicio: "19:00",
        horaFin: "20:30",
        actividadProfesorId: vinculoMarina.id,
      },
      {
        actividadId: jiujitsu.id,
        diaSemana: "JUEVES",
        horaInicio: "19:00",
        horaFin: "20:30",
        actividadProfesorId: vinculoMarina.id,
      },
    ],
  });

  const tipoMusculacionMensual = await prisma.tipoMembresia.create({
    data: {
      gimnasioId: gimnasio.id,
      actividadId: musculacion.id,
      nombre: "Mensual",
      precio: 15000,
      duracionDias: 30,
    },
  });

  const tipoJiuJitsuMensual = await prisma.tipoMembresia.create({
    data: {
      gimnasioId: gimnasio.id,
      actividadId: jiujitsu.id,
      nombre: "Mensual",
      precio: 12000,
      duracionDias: 30,
    },
  });

  await prisma.tipoMembresia.create({
    data: {
      gimnasioId: gimnasio.id,
      actividadId: jiujitsu.id,
      nombre: "Clase suelta",
      precio: 2000,
      duracionDias: 1,
      cantidadClases: 1,
    },
  });

  const socio1 = await prisma.socio.create({
    data: {
      gimnasioId: gimnasio.id,
      nombre: "Juan",
      apellido: "Pérez",
      dni: "30123456",
      email: "juan.perez@mail.com",
      telefono: "291-5556666",
    },
  });

  const socio2 = await prisma.socio.create({
    data: {
      gimnasioId: gimnasio.id,
      nombre: "Lucía",
      apellido: "Fernández",
      dni: "32456789",
      email: "lucia.fernandez@mail.com",
      telefono: "291-7778888",
    },
  });

  const hoy = new Date();
  const enUnMes = new Date();
  enUnMes.setDate(hoy.getDate() + 30);

  // Socio 1: solo musculación
  const membresiaSocio1 = await prisma.membresia.create({
    data: {
      gimnasioId: gimnasio.id,
      socioId: socio1.id,
      actividadId: musculacion.id,
      tipoMembresiaId: tipoMusculacionMensual.id,
      fechaInicio: hoy,
      fechaFin: enUnMes,
      estado: "ACTIVA",
    },
  });

  // Socio 2: musculación + jiujitsu (caso de dos actividades en paralelo)
  const membresiaSocio2Jiujitsu = await prisma.membresia.create({
    data: {
      gimnasioId: gimnasio.id,
      socioId: socio2.id,
      actividadId: jiujitsu.id,
      tipoMembresiaId: tipoJiuJitsuMensual.id,
      fechaInicio: hoy,
      fechaFin: enUnMes,
      estado: "ACTIVA",
    },
  });

  const membresiaSocio2Musculacion = await prisma.membresia.create({
    data: {
      gimnasioId: gimnasio.id,
      socioId: socio2.id,
      actividadId: musculacion.id,
      tipoMembresiaId: tipoMusculacionMensual.id,
      fechaInicio: hoy,
      fechaFin: enUnMes,
      estado: "ACTIVA",
    },
  });

  await prisma.pago.createMany({
    data: [
      {
        gimnasioId: gimnasio.id,
        socioId: socio1.id,
        membresiaId: membresiaSocio1.id,
        monto: 15000,
        metodoPago: "EFECTIVO",
        estado: "PAGADO",
      },
      {
        gimnasioId: gimnasio.id,
        socioId: socio2.id,
        membresiaId: membresiaSocio2Jiujitsu.id,
        monto: 12000,
        metodoPago: "TRANSFERENCIA",
        estado: "PAGADO",
      },
      {
        gimnasioId: gimnasio.id,
        socioId: socio2.id,
        membresiaId: membresiaSocio2Musculacion.id,
        monto: 15000,
        metodoPago: "MERCADO_PAGO",
        estado: "PENDIENTE",
      },
    ],
  });

  console.log("✅ Seed completado");
  console.log(`   Gimnasio: ${gimnasio.nombre} (${gimnasio.id})`);
  console.log(`   Admin: ${admin.email} / contraseña: admin123`);
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
