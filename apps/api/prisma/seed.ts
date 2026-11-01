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

  // ── Segundo gimnasio: sirve para probar el aislamiento entre tenants ──
  const gimnasio2 = await prisma.gimnasio.create({
    data: {
      nombre: "PowerGym Punta Alta",
      slug: "powergym-punta-alta",
      email: "contacto@powergym.com",
      telefono: "291-4445555",
      direccion: "Calle Rivadavia 456, Punta Alta",
    },
  });

  const admin2 = await prisma.usuario.create({
    data: {
      gimnasioId: gimnasio2.id,
      email: "admin@powergym.com",
      passwordHash, // misma contraseña de prueba que el admin del primer gimnasio
      nombre: "Pablo",
      apellido: "Administrador",
      rol: "ADMIN",
    },
  });

  // Mismo email que el admin del primer gimnasio, pero en otro tenant y con otra
  // contraseña: el email es único por gimnasio, no global. Por eso el login pide el slug.
  const passwordHashRecepcion = await bcrypt.hash("recepcion123", 10);
  await prisma.usuario.create({
    data: {
      gimnasioId: gimnasio2.id,
      email: admin.email,
      passwordHash: passwordHashRecepcion,
      nombre: "Laura",
      apellido: "Recepción",
      rol: "RECEPCIONISTA",
    },
  });

  const profeCrossfit = await prisma.profesor.create({
    data: {
      gimnasioId: gimnasio2.id,
      nombre: "Sofía",
      apellido: "Ramírez",
      especialidad: "CrossFit",
      telefono: "291-6667777",
    },
  });

  const crossfit = await prisma.actividad.create({
    data: {
      gimnasioId: gimnasio2.id,
      nombre: "CrossFit",
      descripcion: "Entrenamiento funcional de alta intensidad",
      cupo: 15,
    },
  });

  const vinculoSofia = await prisma.actividadProfesor.create({
    data: { gimnasioId: gimnasio2.id, actividadId: crossfit.id, profesorId: profeCrossfit.id },
  });

  await prisma.horario.createMany({
    data: [
      {
        actividadId: crossfit.id,
        diaSemana: "LUNES",
        horaInicio: "18:00",
        horaFin: "19:00",
        actividadProfesorId: vinculoSofia.id,
      },
      {
        actividadId: crossfit.id,
        diaSemana: "MIERCOLES",
        horaInicio: "18:00",
        horaFin: "19:00",
        actividadProfesorId: vinculoSofia.id,
      },
    ],
  });

  const tipoCrossfitMensual = await prisma.tipoMembresia.create({
    data: {
      gimnasioId: gimnasio2.id,
      actividadId: crossfit.id,
      nombre: "Mensual",
      precio: 18000,
      duracionDias: 30,
    },
  });

  // Mismo DNI que Juan Pérez del primer gimnasio: la unicidad del DNI es por gimnasio
  const socio3 = await prisma.socio.create({
    data: {
      gimnasioId: gimnasio2.id,
      nombre: "Martín",
      apellido: "López",
      dni: "30123456",
      email: "martin.lopez@mail.com",
      telefono: "291-8889999",
    },
  });

  // Socio sin membresía ni pagos
  await prisma.socio.create({
    data: {
      gimnasioId: gimnasio2.id,
      nombre: "Valeria",
      apellido: "Gómez",
      dni: "33987654",
      email: "valeria.gomez@mail.com",
    },
  });

  const membresiaSocio3 = await prisma.membresia.create({
    data: {
      gimnasioId: gimnasio2.id,
      socioId: socio3.id,
      actividadId: crossfit.id,
      tipoMembresiaId: tipoCrossfitMensual.id,
      fechaInicio: hoy,
      fechaFin: enUnMes,
      estado: "ACTIVA",
    },
  });

  await prisma.pago.create({
    data: {
      gimnasioId: gimnasio2.id,
      socioId: socio3.id,
      membresiaId: membresiaSocio3.id,
      monto: 18000,
      metodoPago: "TARJETA",
      estado: "PAGADO",
    },
  });

  console.log("✅ Seed completado");
  console.log(`   Gimnasio 1: ${gimnasio.nombre} (${gimnasio.id})`);
  console.log(`   Admin 1: ${admin.email} / contraseña: admin123`);
  console.log(`   Gimnasio 2: ${gimnasio2.nombre} (${gimnasio2.id})`);
  console.log(`   Admin 2: ${admin2.email} / contraseña: admin123`);
  console.log(
    `   Recepción 2: ${admin.email} / contraseña: recepcion123 (mismo email, otro gimnasio)`
  );
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
