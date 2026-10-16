import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function limpiarBase() {
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
}

async function crearGimnasio() {
  return prisma.gimnasio.create({
    data: {
      nombre: "FitZone Bahía Blanca",
      slug: "fitzone-bahia-blanca",
      email: "contacto@fitzone.com",
      telefono: "291-1234567",
      direccion: "Av. Colón 123, Bahía Blanca",
    },
  });
}

async function crearAdmin(gimnasioId: string) {
  const passwordHash = await bcrypt.hash("admin123", 10);
  return prisma.usuario.create({
    data: {
      gimnasioId,
      email: "admin@fitzone.com",
      passwordHash,
      nombre: "Ana",
      apellido: "Administradora",
      rol: "ADMIN",
    },
  });
}

async function crearMusculacion(gimnasioId: string) {
  const profesorCarlos = await prisma.profesor.create({
    data: {
      gimnasioId,
      nombre: "Carlos",
      apellido: "Gómez",
      especialidad: "Musculación",
      telefono: "291-1112222",
    },
  });
  const profesorDiego = await prisma.profesor.create({
    data: {
      gimnasioId,
      nombre: "Diego",
      apellido: "Torres",
      especialidad: "Musculación y funcional",
      telefono: "291-9990000",
    },
  });
  const actividad = await prisma.actividad.create({
    data: {
      gimnasioId,
      nombre: "Musculación",
      descripcion: "Sala de musculación libre con asesoramiento",
      cupo: 30,
    },
  });

  const vinculoCarlos = await prisma.actividadProfesor.create({
    data: { gimnasioId, actividadId: actividad.id, profesorId: profesorCarlos.id },
  });
  const vinculoDiego = await prisma.actividadProfesor.create({
    data: { gimnasioId, actividadId: actividad.id, profesorId: profesorDiego.id },
  });

  await prisma.horario.createMany({
    data: [
      {
        actividadId: actividad.id,
        diaSemana: "LUNES",
        horaInicio: "08:00",
        horaFin: "22:00",
        actividadProfesorId: vinculoCarlos.id,
      },
      {
        actividadId: actividad.id,
        diaSemana: "MIERCOLES",
        horaInicio: "08:00",
        horaFin: "22:00",
        actividadProfesorId: vinculoCarlos.id,
      },
      {
        actividadId: actividad.id,
        diaSemana: "VIERNES",
        horaInicio: "08:00",
        horaFin: "22:00",
        actividadProfesorId: vinculoDiego.id,
      },
      { actividadId: actividad.id, diaSemana: "SABADO", horaInicio: "09:00", horaFin: "13:00" }, // sin profesor fijo asignado
    ],
  });

  const tipoMembresia = await prisma.tipoMembresia.create({
    data: {
      gimnasioId,
      actividadId: actividad.id,
      nombre: "Mensual",
      precio: 15000,
      duracionDias: 30,
    },
  });

  return { actividad, tipoMembresia };
}

async function crearJiuJitsu(gimnasioId: string) {
  const profesor = await prisma.profesor.create({
    data: {
      gimnasioId,
      nombre: "Marina",
      apellido: "Silva",
      especialidad: "Jiu-Jitsu",
      telefono: "291-3334444",
    },
  });
  const actividad = await prisma.actividad.create({
    data: {
      gimnasioId,
      nombre: "Jiu-Jitsu",
      descripcion: "Clases de Jiu-Jitsu para todos los niveles",
      cupo: 20,
    },
  });
  const vinculo = await prisma.actividadProfesor.create({
    data: { gimnasioId, actividadId: actividad.id, profesorId: profesor.id },
  });

  await prisma.horario.createMany({
    data: [
      {
        actividadId: actividad.id,
        diaSemana: "MARTES",
        horaInicio: "19:00",
        horaFin: "20:30",
        actividadProfesorId: vinculo.id,
      },
      {
        actividadId: actividad.id,
        diaSemana: "JUEVES",
        horaInicio: "19:00",
        horaFin: "20:30",
        actividadProfesorId: vinculo.id,
      },
    ],
  });

  const tipoMembresia = await prisma.tipoMembresia.create({
    data: {
      gimnasioId,
      actividadId: actividad.id,
      nombre: "Mensual",
      precio: 12000,
      duracionDias: 30,
    },
  });
  await prisma.tipoMembresia.create({
    data: {
      gimnasioId,
      actividadId: actividad.id,
      nombre: "Clase suelta",
      precio: 2000,
      duracionDias: 1,
      cantidadClases: 1,
    },
  });

  return { actividad, tipoMembresia };
}

async function crearSocios(gimnasioId: string) {
  const socio1 = await prisma.socio.create({
    data: {
      gimnasioId,
      nombre: "Juan",
      apellido: "Pérez",
      dni: "30123456",
      email: "juan.perez@mail.com",
      telefono: "291-5556666",
    },
  });
  const socio2 = await prisma.socio.create({
    data: {
      gimnasioId,
      nombre: "Lucía",
      apellido: "Fernández",
      dni: "32456789",
      email: "lucia.fernandez@mail.com",
      telefono: "291-7778888",
    },
  });
  return { socio1, socio2 };
}

async function crearMembresiasYPagos(
  gimnasioId: string,
  socios: Awaited<ReturnType<typeof crearSocios>>,
  musculacion: Awaited<ReturnType<typeof crearMusculacion>>,
  jiuJitsu: Awaited<ReturnType<typeof crearJiuJitsu>>
) {
  const hoy = new Date();
  const enUnMes = new Date();
  enUnMes.setDate(hoy.getDate() + 30);

  // Socio 1: solo musculación
  const membresiaSocio1 = await prisma.membresia.create({
    data: {
      gimnasioId,
      socioId: socios.socio1.id,
      actividadId: musculacion.actividad.id,
      tipoMembresiaId: musculacion.tipoMembresia.id,
      fechaInicio: hoy,
      fechaFin: enUnMes,
      estado: "ACTIVA",
    },
  });

  // Socio 2: musculación + jiu-jitsu (caso de dos actividades en paralelo)
  const membresiaSocio2JiuJitsu = await prisma.membresia.create({
    data: {
      gimnasioId,
      socioId: socios.socio2.id,
      actividadId: jiuJitsu.actividad.id,
      tipoMembresiaId: jiuJitsu.tipoMembresia.id,
      fechaInicio: hoy,
      fechaFin: enUnMes,
      estado: "ACTIVA",
    },
  });
  const membresiaSocio2Musculacion = await prisma.membresia.create({
    data: {
      gimnasioId,
      socioId: socios.socio2.id,
      actividadId: musculacion.actividad.id,
      tipoMembresiaId: musculacion.tipoMembresia.id,
      fechaInicio: hoy,
      fechaFin: enUnMes,
      estado: "ACTIVA",
    },
  });

  await prisma.pago.createMany({
    data: [
      {
        gimnasioId,
        socioId: socios.socio1.id,
        membresiaId: membresiaSocio1.id,
        monto: 15000,
        metodoPago: "EFECTIVO",
        estado: "PAGADO",
      },
      {
        gimnasioId,
        socioId: socios.socio2.id,
        membresiaId: membresiaSocio2JiuJitsu.id,
        monto: 12000,
        metodoPago: "TRANSFERENCIA",
        estado: "PAGADO",
      },
      {
        gimnasioId,
        socioId: socios.socio2.id,
        membresiaId: membresiaSocio2Musculacion.id,
        monto: 15000,
        metodoPago: "MERCADO_PAGO",
        estado: "PENDIENTE",
      },
    ],
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("El seed no se puede ejecutar en producción.");
  }

  await limpiarBase();
  const gimnasio = await crearGimnasio();
  const admin = await crearAdmin(gimnasio.id);
  const musculacion = await crearMusculacion(gimnasio.id);
  const jiuJitsu = await crearJiuJitsu(gimnasio.id);
  const socios = await crearSocios(gimnasio.id);
  await crearMembresiasYPagos(gimnasio.id, socios, musculacion, jiuJitsu);

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
