import { prisma } from "../../src/config/database";
import { Prisma } from "../../src/generated/prisma/client";
import { signToken } from "../../src/utils/jwt";
import { hashPassword } from "../../src/utils/password";

// Contraseña de todos los usuarios de prueba
export const PASSWORD = "clave-test-123";

// El hash se calcula una sola vez: bcrypt es lento a propósito y se crean muchos usuarios
let hashCache: string | undefined;
async function passwordHash(): Promise<string> {
  hashCache ??= await hashPassword(PASSWORD);
  return hashCache;
}

let contador = 0;
const siguiente = () => ++contador;

interface DatosGimnasio {
  nombre?: string;
  slug?: string;
  activo?: boolean;
}

export async function crearGimnasio(datos: DatosGimnasio = {}) {
  const n = siguiente();
  return prisma.gimnasio.create({
    data: { nombre: `Gimnasio ${n}`, slug: `gimnasio-${n}`, ...datos },
  });
}

interface DatosUsuario {
  email?: string;
  nombre?: string;
  apellido?: string;
  rol?: "ADMIN" | "RECEPCIONISTA";
  activo?: boolean;
  /** Contraseña distinta de PASSWORD (por defecto todos los usuarios usan PASSWORD) */
  password?: string;
}

export async function crearUsuario(gimnasioId: string, datos: DatosUsuario = {}) {
  const n = siguiente();
  const { password, ...resto } = datos;
  return prisma.usuario.create({
    data: {
      gimnasioId,
      email: `usuario${n}@test.com`,
      passwordHash: password ? await hashPassword(password) : await passwordHash(),
      nombre: "Nombre",
      apellido: `Apellido${n}`,
      rol: "RECEPCIONISTA",
      ...resto,
    },
  });
}

interface DatosSocio {
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string;
  activo?: boolean;
}

export async function crearSocio(gimnasioId: string, datos: DatosSocio = {}) {
  const n = siguiente();
  return prisma.socio.create({
    data: { gimnasioId, nombre: "Socio", apellido: `Apellido${n}`, dni: `DNI-${n}`, ...datos },
  });
}

interface DatosProfesor {
  nombre?: string;
  apellido?: string;
  activo?: boolean;
}

export async function crearProfesor(gimnasioId: string, datos: DatosProfesor = {}) {
  const n = siguiente();
  return prisma.profesor.create({
    data: { gimnasioId, nombre: "Profe", apellido: `Apellido${n}`, ...datos },
  });
}

interface DatosActividad {
  nombre?: string;
  descripcion?: string;
  cupo?: number;
  activa?: boolean;
}

export async function crearActividad(gimnasioId: string, datos: DatosActividad = {}) {
  const n = siguiente();
  return prisma.actividad.create({
    data: { gimnasioId, nombre: `Actividad ${n}`, ...datos },
  });
}

interface DatosTipoMembresia {
  nombre?: string;
  precio?: string | number;
  duracionDias?: number;
  cantidadClases?: number | null;
  activo?: boolean;
}

export async function crearTipoMembresia(
  gimnasioId: string,
  actividadId: string,
  datos: DatosTipoMembresia = {}
) {
  const n = siguiente();
  const { precio = "12500.50", ...resto } = datos;
  return prisma.tipoMembresia.create({
    data: {
      gimnasioId,
      actividadId,
      nombre: `Plan ${n}`,
      precio: new Prisma.Decimal(precio),
      duracionDias: 30,
      ...resto,
    },
  });
}

interface DatosMembresia {
  fechaInicio?: Date;
  fechaFin?: Date;
  estado?: "ACTIVA" | "VENCIDA" | "CANCELADA";
  recordatorioEnviado?: boolean;
}

export async function crearMembresia(
  gimnasioId: string,
  socioId: string,
  actividadId: string,
  tipoMembresiaId: string,
  datos: DatosMembresia = {}
) {
  const fechaInicio = datos.fechaInicio ?? new Date();
  const fechaFin = datos.fechaFin ?? new Date(fechaInicio.getTime() + 30 * 24 * 60 * 60 * 1000);
  return prisma.membresia.create({
    data: {
      gimnasioId,
      socioId,
      actividadId,
      tipoMembresiaId,
      fechaInicio,
      fechaFin,
      estado: datos.estado ?? "ACTIVA",
      recordatorioEnviado: datos.recordatorioEnviado ?? false,
    },
  });
}

interface DatosPago {
  membresiaId?: string | null;
  monto?: string | number;
  fecha?: Date;
  metodoPago?: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "MERCADO_PAGO";
  estado?: "PENDIENTE" | "PAGADO" | "RECHAZADO";
  concepto?: string | null;
}

export async function crearPago(gimnasioId: string, socioId: string, datos: DatosPago = {}) {
  return prisma.pago.create({
    data: {
      gimnasioId,
      socioId,
      membresiaId: datos.membresiaId ?? null,
      monto: new Prisma.Decimal(datos.monto ?? "12500.50"),
      fecha: datos.fecha,
      metodoPago: datos.metodoPago ?? "EFECTIVO",
      estado: datos.estado ?? "PENDIENTE",
      concepto: datos.concepto,
    },
  });
}

export async function crearVinculo(gimnasioId: string, actividadId: string, profesorId: string) {
  return prisma.actividadProfesor.create({ data: { gimnasioId, actividadId, profesorId } });
}

interface DatosHorario {
  diaSemana?: "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";
  horaInicio?: string;
  horaFin?: string;
  actividadProfesorId?: string | null;
}

export async function crearHorario(
  gimnasioId: string,
  actividadId: string,
  datos: DatosHorario = {}
) {
  return prisma.horario.create({
    data: {
      gimnasioId,
      actividadId,
      diaSemana: "LUNES",
      horaInicio: "18:00",
      horaFin: "19:00",
      ...datos,
    },
  });
}

// Una actividad con un horario, para probar relaciones y modelos sin aislar todavía
export async function crearActividadConHorario(gimnasioId: string) {
  const n = siguiente();
  return prisma.actividad.create({
    data: {
      gimnasioId,
      nombre: `Actividad ${n}`,
      horarios: {
        create: [{ gimnasioId, diaSemana: "LUNES", horaInicio: "18:00", horaFin: "19:00" }],
      },
    },
    include: { horarios: true },
  });
}

// Dos gimnasios, cada uno con un administrador y su token: el punto de partida
// de casi todos los tests de aislamiento.
export async function crearEscenario() {
  const gimnasioA = await crearGimnasio();
  const gimnasioB = await crearGimnasio();
  const adminA = await crearUsuario(gimnasioA.id, { rol: "ADMIN" });
  const adminB = await crearUsuario(gimnasioB.id, { rol: "ADMIN" });

  return {
    a: { gimnasio: gimnasioA, admin: adminA, token: tokenDe(adminA) },
    b: { gimnasio: gimnasioB, admin: adminB, token: tokenDe(adminB) },
  };
}

// Token válido para un usuario, sin pasar por el login
export function tokenDe(usuario: { id: string; gimnasioId: string; tokenVersion: number }): string {
  return signToken({
    usuarioId: usuario.id,
    gimnasioId: usuario.gimnasioId,
    tokenVersion: usuario.tokenVersion,
  });
}

export function conToken(token: string) {
  return { Authorization: `Bearer ${token}` };
}
