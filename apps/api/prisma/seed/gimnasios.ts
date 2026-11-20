// Los datos de prueba de cada gimnasio. Hay dos para poder probar el aislamiento entre tenants.
import type { PrismaClient } from "../../src/generated/prisma/client";
import {
  crearActividad,
  crearGimnasio,
  crearHorarios,
  crearMembresia,
  crearPagos,
  crearProfesor,
  crearSocio,
  crearTipoMembresia,
  crearUsuario,
  enDias,
  vincularProfesor,
} from "./entidades";

export const PASSWORD_ADMIN = "admin123";
export const PASSWORD_RECEPCION = "recepcion123";

export async function sembrarFitZone(prisma: PrismaClient) {
  const gimnasio = await crearGimnasio(prisma, {
    nombre: "FitZone Bahía Blanca",
    slug: "fitzone-bahia-blanca",
    email: "contacto@fitzone.com",
    telefono: "291-1234567",
    direccion: "Av. Colón 123, Bahía Blanca",
  });
  const g = gimnasio.id;

  const admin = await crearUsuario(prisma, g, {
    email: "admin@fitzone.com",
    password: PASSWORD_ADMIN,
    nombre: "Ana",
    apellido: "Administradora",
    rol: "ADMIN",
  });

  // Musculación: dos profesores vinculados y un horario sin profesor fijo
  const carlos = await crearProfesor(prisma, g, {
    nombre: "Carlos",
    apellido: "Gómez",
    especialidad: "Musculación",
    telefono: "291-1112222",
  });
  const diego = await crearProfesor(prisma, g, {
    nombre: "Diego",
    apellido: "Torres",
    especialidad: "Musculación y funcional",
    telefono: "291-9990000",
  });
  const musculacion = await crearActividad(prisma, g, {
    nombre: "Musculación",
    descripcion: "Sala de musculación libre con asesoramiento",
    cupo: 30,
  });
  const vinculoCarlos = await vincularProfesor(prisma, g, musculacion.id, carlos.id);
  const vinculoDiego = await vincularProfesor(prisma, g, musculacion.id, diego.id);
  await crearHorarios(prisma, g, musculacion.id, [
    {
      diaSemana: "LUNES",
      horaInicio: "08:00",
      horaFin: "22:00",
      actividadProfesorId: vinculoCarlos.id,
    },
    {
      diaSemana: "MIERCOLES",
      horaInicio: "08:00",
      horaFin: "22:00",
      actividadProfesorId: vinculoCarlos.id,
    },
    {
      diaSemana: "VIERNES",
      horaInicio: "08:00",
      horaFin: "22:00",
      actividadProfesorId: vinculoDiego.id,
    },
    { diaSemana: "SABADO", horaInicio: "09:00", horaFin: "13:00" },
  ]);

  const marina = await crearProfesor(prisma, g, {
    nombre: "Marina",
    apellido: "Silva",
    especialidad: "Jiu-Jitsu",
    telefono: "291-3334444",
  });
  const jiujitsu = await crearActividad(prisma, g, {
    nombre: "Jiu-Jitsu",
    descripcion: "Clases de Jiu-Jitsu para todos los niveles",
    cupo: 20,
  });
  const vinculoMarina = await vincularProfesor(prisma, g, jiujitsu.id, marina.id);
  await crearHorarios(prisma, g, jiujitsu.id, [
    {
      diaSemana: "MARTES",
      horaInicio: "19:00",
      horaFin: "20:30",
      actividadProfesorId: vinculoMarina.id,
    },
    {
      diaSemana: "JUEVES",
      horaInicio: "19:00",
      horaFin: "20:30",
      actividadProfesorId: vinculoMarina.id,
    },
  ]);

  const musculacionMensual = await crearTipoMembresia(prisma, g, {
    actividadId: musculacion.id,
    nombre: "Mensual",
    precio: 15000,
    duracionDias: 30,
  });
  const jiujitsuMensual = await crearTipoMembresia(prisma, g, {
    actividadId: jiujitsu.id,
    nombre: "Mensual",
    precio: 12000,
    duracionDias: 30,
  });
  await crearTipoMembresia(prisma, g, {
    actividadId: jiujitsu.id,
    nombre: "Clase suelta",
    precio: 2000,
    duracionDias: 1,
    cantidadClases: 1,
  });

  const juan = await crearSocio(prisma, g, {
    nombre: "Juan",
    apellido: "Pérez",
    dni: "30123456",
    email: "juan.perez@mail.com",
    telefono: "291-5556666",
  });
  const lucia = await crearSocio(prisma, g, {
    nombre: "Lucía",
    apellido: "Fernández",
    dni: "32456789",
    email: "lucia.fernandez@mail.com",
    telefono: "291-7778888",
  });

  // Juan: solo musculación. Lucía: dos actividades en paralelo
  const vigencia = { fechaInicio: enDias(0), fechaFin: enDias(30), estado: "ACTIVA" } as const;
  const membresiaJuan = await crearMembresia(prisma, g, {
    ...vigencia,
    socioId: juan.id,
    actividadId: musculacion.id,
    tipoMembresiaId: musculacionMensual.id,
  });
  const membresiaLuciaJiujitsu = await crearMembresia(prisma, g, {
    ...vigencia,
    socioId: lucia.id,
    actividadId: jiujitsu.id,
    tipoMembresiaId: jiujitsuMensual.id,
  });
  const membresiaLuciaMusculacion = await crearMembresia(prisma, g, {
    ...vigencia,
    socioId: lucia.id,
    actividadId: musculacion.id,
    tipoMembresiaId: musculacionMensual.id,
  });

  await crearPagos(prisma, g, [
    {
      socioId: juan.id,
      membresiaId: membresiaJuan.id,
      monto: 15000,
      metodoPago: "EFECTIVO",
      estado: "PAGADO",
    },
    {
      socioId: lucia.id,
      membresiaId: membresiaLuciaJiujitsu.id,
      monto: 12000,
      metodoPago: "TRANSFERENCIA",
      estado: "PAGADO",
    },
    {
      socioId: lucia.id,
      membresiaId: membresiaLuciaMusculacion.id,
      monto: 15000,
      metodoPago: "MERCADO_PAGO",
      estado: "PENDIENTE",
    },
  ]);

  return { gimnasio, admin };
}

// `emailCompartido`: el email del admin de FitZone. Se repite acá en otro usuario porque el
// email es único por gimnasio, no global (por eso el login pide el slug).
export async function sembrarPowerGym(prisma: PrismaClient, emailCompartido: string) {
  const gimnasio = await crearGimnasio(prisma, {
    nombre: "PowerGym Punta Alta",
    slug: "powergym-punta-alta",
    email: "contacto@powergym.com",
    telefono: "291-4445555",
    direccion: "Calle Rivadavia 456, Punta Alta",
  });
  const g = gimnasio.id;

  const admin = await crearUsuario(prisma, g, {
    email: "admin@powergym.com",
    password: PASSWORD_ADMIN,
    nombre: "Pablo",
    apellido: "Administrador",
    rol: "ADMIN",
  });
  const recepcion = await crearUsuario(prisma, g, {
    email: emailCompartido,
    password: PASSWORD_RECEPCION,
    nombre: "Laura",
    apellido: "Recepción",
    rol: "RECEPCIONISTA",
  });

  const sofia = await crearProfesor(prisma, g, {
    nombre: "Sofía",
    apellido: "Ramírez",
    especialidad: "CrossFit",
    telefono: "291-6667777",
  });
  const crossfit = await crearActividad(prisma, g, {
    nombre: "CrossFit",
    descripcion: "Entrenamiento funcional de alta intensidad",
    cupo: 15,
  });
  const vinculoSofia = await vincularProfesor(prisma, g, crossfit.id, sofia.id);
  await crearHorarios(prisma, g, crossfit.id, [
    {
      diaSemana: "LUNES",
      horaInicio: "18:00",
      horaFin: "19:00",
      actividadProfesorId: vinculoSofia.id,
    },
    {
      diaSemana: "MIERCOLES",
      horaInicio: "18:00",
      horaFin: "19:00",
      actividadProfesorId: vinculoSofia.id,
    },
  ]);

  const crossfitMensual = await crearTipoMembresia(prisma, g, {
    actividadId: crossfit.id,
    nombre: "Mensual",
    precio: 18000,
    duracionDias: 30,
  });

  // Mismo DNI que Juan Pérez de FitZone: la unicidad del DNI es por gimnasio
  const martin = await crearSocio(prisma, g, {
    nombre: "Martín",
    apellido: "López",
    dni: "30123456",
    email: "martin.lopez@mail.com",
    telefono: "291-8889999",
  });
  // Socia sin membresía ni pagos
  await crearSocio(prisma, g, {
    nombre: "Valeria",
    apellido: "Gómez",
    dni: "33987654",
    email: "valeria.gomez@mail.com",
  });

  const membresiaMartin = await crearMembresia(prisma, g, {
    socioId: martin.id,
    actividadId: crossfit.id,
    tipoMembresiaId: crossfitMensual.id,
    fechaInicio: enDias(0),
    fechaFin: enDias(30),
    estado: "ACTIVA",
  });
  await crearPagos(prisma, g, [
    {
      socioId: martin.id,
      membresiaId: membresiaMartin.id,
      monto: 18000,
      metodoPago: "TARJETA",
      estado: "PAGADO",
    },
  ]);

  return { gimnasio, admin, recepcion };
}
