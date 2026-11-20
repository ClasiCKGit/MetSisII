// Una función por entidad. Reciben el cliente y el gimnasioId explícitos: el seed usa el
// prisma global (no hay sesión), así que el gimnasioId no lo agrega ninguna extensión.
import bcrypt from "bcrypt";
import type { Prisma, PrismaClient } from "../../src/generated/prisma/client";

type DatosDe<T> = Omit<T, "gimnasioId">;

// Borra en orden inverso a las FKs
export async function limpiarBase(prisma: PrismaClient) {
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

export function crearGimnasio(prisma: PrismaClient, datos: Prisma.GimnasioUncheckedCreateInput) {
  return prisma.gimnasio.create({ data: datos });
}

export async function crearUsuario(
  prisma: PrismaClient,
  gimnasioId: string,
  {
    password,
    ...datos
  }: Omit<DatosDe<Prisma.UsuarioUncheckedCreateInput>, "passwordHash"> & {
    password: string;
  }
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.usuario.create({ data: { ...datos, gimnasioId, passwordHash } });
}

export function crearProfesor(
  prisma: PrismaClient,
  gimnasioId: string,
  datos: DatosDe<Prisma.ProfesorUncheckedCreateInput>
) {
  return prisma.profesor.create({ data: { ...datos, gimnasioId } });
}

export function crearActividad(
  prisma: PrismaClient,
  gimnasioId: string,
  datos: DatosDe<Prisma.ActividadUncheckedCreateInput>
) {
  return prisma.actividad.create({ data: { ...datos, gimnasioId } });
}

export function vincularProfesor(
  prisma: PrismaClient,
  gimnasioId: string,
  actividadId: string,
  profesorId: string
) {
  return prisma.actividadProfesor.create({ data: { gimnasioId, actividadId, profesorId } });
}

// Los horarios de una actividad; sin actividadProfesorId el horario queda sin profesor fijo
export function crearHorarios(
  prisma: PrismaClient,
  gimnasioId: string,
  actividadId: string,
  horarios: Omit<DatosDe<Prisma.HorarioCreateManyInput>, "actividadId">[]
) {
  return prisma.horario.createMany({
    data: horarios.map((horario) => ({ ...horario, gimnasioId, actividadId })),
  });
}

export function crearTipoMembresia(
  prisma: PrismaClient,
  gimnasioId: string,
  datos: DatosDe<Prisma.TipoMembresiaUncheckedCreateInput>
) {
  return prisma.tipoMembresia.create({ data: { ...datos, gimnasioId } });
}

export function crearSocio(
  prisma: PrismaClient,
  gimnasioId: string,
  datos: DatosDe<Prisma.SocioUncheckedCreateInput>
) {
  return prisma.socio.create({ data: { ...datos, gimnasioId } });
}

export function crearMembresia(
  prisma: PrismaClient,
  gimnasioId: string,
  datos: DatosDe<Prisma.MembresiaUncheckedCreateInput>
) {
  return prisma.membresia.create({ data: { ...datos, gimnasioId } });
}

export function crearPagos(
  prisma: PrismaClient,
  gimnasioId: string,
  pagos: DatosDe<Prisma.PagoCreateManyInput>[]
) {
  return prisma.pago.createMany({ data: pagos.map((pago) => ({ ...pago, gimnasioId })) });
}

// Fecha a n días de hoy (negativo: en el pasado)
export function enDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}
