import { useAuthStore } from "@/store/auth.store";
import { obtenerUltimoTokenDeReset } from "../mocks/fake-api";

// Llamadas directas a la API (sin pasar por la app), para preparar escenarios y comprobar resultados.
// Funcionan igual contra la API falsa y contra la real.
const API = `${import.meta.env.VITE_API_URL}/api`;
const JSON_HEADERS = { "Content-Type": "application/json" };
const conToken = (token: string) => ({ ...JSON_HEADERS, Authorization: `Bearer ${token}` });

export interface GimnasioDePrueba {
  slug: string;
  nombre: string;
  email: string;
  password: string;
  token: string;
  adminId: string;
}

// Cada test crea SU PROPIO gimnasio: así no comparten datos (en la API real tampoco se pisan)
export async function nuevoGimnasio(): Promise<GimnasioDePrueba> {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const slug = `gym-${id}`;
  const nombre = `Gimnasio ${id}`;
  const email = `admin@${slug}.com`;
  const password = "admin12345";

  const res = await fetch(`${API}/auth/register-gimnasio`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      gimnasio: { nombre, slug },
      admin: { nombre: "Ana", apellido: "Admin", email, password },
    }),
  });
  const sesion = (await res.json()) as { token: string; usuario: { id: string } };
  return { slug, nombre, email, password, token: sesion.token, adminId: sesion.usuario.id };
}

export interface UsuarioDePrueba {
  id: string;
  email: string;
  password: string;
}

export async function apiCrearUsuario(
  token: string,
  datos: { nombre: string; apellido: string; email: string; rol?: string; password?: string }
): Promise<UsuarioDePrueba> {
  const password = datos.password ?? "clave12345";
  const res = await fetch(`${API}/usuarios`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify({ ...datos, password }),
  });
  const creado = (await res.json()) as { id: string; email: string };
  return { id: creado.id, email: creado.email, password };
}

export interface ProfesorDePrueba {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  activo: boolean;
}

export async function apiCrearProfesor(
  token: string,
  datos: {
    nombre: string;
    apellido: string;
    especialidad?: string;
    email?: string;
    telefono?: string;
  }
): Promise<ProfesorDePrueba> {
  const res = await fetch(`${API}/profesores`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify(datos),
  });
  return (await res.json()) as ProfesorDePrueba;
}

export async function apiListarProfesores(token: string): Promise<ProfesorDePrueba[]> {
  const res = await fetch(`${API}/profesores`, { headers: conToken(token) });
  return (await res.json()) as ProfesorDePrueba[];
}

export interface ActividadDePrueba {
  id: string;
  nombre: string;
  descripcion: string | null;
  cupo: number | null;
  activa: boolean;
}

export async function apiCrearActividad(
  token: string,
  datos: { nombre: string; descripcion?: string; cupo?: number }
): Promise<ActividadDePrueba> {
  const res = await fetch(`${API}/actividades`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify(datos),
  });
  return (await res.json()) as ActividadDePrueba;
}

export async function apiListarActividades(token: string): Promise<ActividadDePrueba[]> {
  const res = await fetch(`${API}/actividades`, { headers: conToken(token) });
  return (await res.json()) as ActividadDePrueba[];
}
export interface VinculoDePrueba {
  id: string;
  actividadId: string;
  profesorId: string;
}

export async function apiVincularProfesor(
  token: string,
  actividadId: string,
  profesorId: string
): Promise<VinculoDePrueba> {
  const res = await fetch(`${API}/actividades/${actividadId}/profesores`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify({ profesorId }),
  });
  return (await res.json()) as VinculoDePrueba;
}

export async function apiListarVinculos(
  token: string,
  actividadId: string
): Promise<VinculoDePrueba[]> {
  const res = await fetch(`${API}/actividades/${actividadId}/profesores`, {
    headers: conToken(token),
  });
  return (await res.json()) as VinculoDePrueba[];
}

export interface HorarioDePrueba {
  id: string;
  actividadId: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  actividadProfesorId: string | null;
}

export async function apiCrearHorario(
  token: string,
  datos: {
    actividadId: string;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    actividadProfesorId?: string | null;
  }
): Promise<HorarioDePrueba> {
  const res = await fetch(`${API}/horarios`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify(datos),
  });
  return (await res.json()) as HorarioDePrueba;
}

export async function apiListarHorarios(
  token: string,
  actividadId: string
): Promise<HorarioDePrueba[]> {
  const res = await fetch(`${API}/horarios?actividadId=${actividadId}`, {
    headers: conToken(token),
  });
  return (await res.json()) as HorarioDePrueba[];
}

export async function apiDesactivarProfesor(token: string, id: string): Promise<void> {
  await fetch(`${API}/profesores/${id}`, {
    method: "PATCH",
    headers: conToken(token),
    body: JSON.stringify({ activo: false }),
  });
}

export async function apiDesactivarActividad(token: string, id: string): Promise<void> {
  await fetch(`${API}/actividades/${id}`, {
    method: "PATCH",
    headers: conToken(token),
    body: JSON.stringify({ activa: false }),
  });
}

export interface SocioDePrueba {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  activo: boolean;
}

export async function apiCrearSocio(
  token: string,
  datos: {
    nombre: string;
    apellido: string;
    dni: string;
    email?: string;
    telefono?: string;
    fechaNacimiento?: string;
  }
): Promise<SocioDePrueba> {
  const res = await fetch(`${API}/socios`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify(datos),
  });
  return (await res.json()) as SocioDePrueba;
}

export async function apiDarDeBajaSocio(token: string, id: string): Promise<void> {
  await fetch(`${API}/socios/${id}`, { method: "DELETE", headers: conToken(token) });
}

// Todos los socios del gimnasio, activos e inactivos
export async function apiListarSocios(token: string): Promise<SocioDePrueba[]> {
  const res = await fetch(`${API}/socios`, { headers: conToken(token) });
  return (await res.json()) as SocioDePrueba[];
}

export interface TipoMembresiaDePrueba {
  id: string;
  nombre: string;
  actividadId: string;
}

export async function apiCrearTipoMembresia(
  token: string,
  datos: { actividadId: string; nombre: string; precio: number; duracionDias: number }
): Promise<TipoMembresiaDePrueba> {
  const res = await fetch(`${API}/tipos-membresia`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify(datos),
  });
  return (await res.json()) as TipoMembresiaDePrueba;
}

export async function apiListarTiposMembresia(
  token: string,
  actividadId: string
): Promise<Array<TipoMembresiaDePrueba & Record<string, unknown>>> {
  const res = await fetch(`${API}/tipos-membresia?actividadId=${actividadId}`, {
    headers: conToken(token),
  });
  return (await res.json()) as Array<TipoMembresiaDePrueba & Record<string, unknown>>;
}

export async function apiDarDeBajaTipoMembresia(token: string, id: string): Promise<void> {
  await fetch(`${API}/tipos-membresia/${id}`, { method: "DELETE", headers: conToken(token) });
}

// Inscribe al socio: crea la membresía y su pago pendiente
export async function apiInscribir(
  token: string,
  datos: {
    socioId: string;
    actividadId: string;
    tipoMembresiaId: string;
    metodoPago: string;
    // ISO; en el pasado sirve para armar membresías por vencer o vencidas
    fechaInicio?: string;
  }
): Promise<{ id: string; pago: { id: string; monto: string } }> {
  const res = await fetch(`${API}/membresias/inscripciones`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify(datos),
  });
  return (await res.json()) as { id: string; pago: { id: string; monto: string } };
}

export async function apiCrearPago(
  token: string,
  datos: {
    socioId: string;
    monto: string;
    metodoPago: string;
    estado?: "PENDIENTE" | "PAGADO" | "RECHAZADO";
    concepto?: string;
    fecha?: string;
  }
): Promise<{ id: string }> {
  const res = await fetch(`${API}/pagos`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify(datos),
  });
  return (await res.json()) as { id: string };
}

export async function apiActualizarUsuario(
  token: string,
  id: string,
  cambios: Record<string, unknown>
): Promise<number> {
  const res = await fetch(`${API}/usuarios/${id}`, {
    method: "PATCH",
    headers: conToken(token),
    body: JSON.stringify(cambios),
  });
  return res.status;
}

// Devuelve el código HTTP del login (200 si las credenciales sirven)
export async function apiLoginStatus(
  slug: string,
  email: string,
  password: string
): Promise<number> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ gimnasioSlug: slug, email, password }),
  });
  return res.status;
}

export async function apiLoginToken(
  slug: string,
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ gimnasioSlug: slug, email, password }),
  });
  return ((await res.json()) as { token: string }).token;
}

export async function apiMeStatus(token: string): Promise<number> {
  const res = await fetch(`${API}/auth/me`, { headers: conToken(token) });
  return res.status;
}

// Deja una sesión guardada, como si el usuario ya hubiera iniciado sesión antes de abrir la app
export async function conSesion(token: string): Promise<void> {
  localStorage.setItem(
    "fitmanager-auth",
    JSON.stringify({ state: { token, ultimoSlug: "" }, version: 0 })
  );
  await useAuthStore.persist.rehydrate();
}

export interface MembresiaDePrueba {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  renovada: boolean;
  actividad: { id: string; nombre: string };
  tipoMembresia: { id: string; nombre: string };
}

export async function apiRenovar(token: string, membresiaId: string): Promise<void> {
  const res = await fetch(`${API}/membresias/${membresiaId}/renovaciones`, {
    method: "POST",
    headers: conToken(token),
    body: JSON.stringify({ metodoPago: "EFECTIVO" }),
  });
  if (!res.ok) throw new Error(`No se pudo renovar: ${res.status} ${await res.text()}`);
}

export async function apiListarMembresias(
  token: string,
  socioId: string
): Promise<MembresiaDePrueba[]> {
  const res = await fetch(`${API}/membresias?socioId=${socioId}`, { headers: conToken(token) });
  return (await res.json()) as MembresiaDePrueba[];
}

export async function apiListarPagos(
  token: string,
  socioId: string
): Promise<
  Array<{
    id: string;
    monto: string;
    metodoPago: string;
    estado: string;
    membresiaId: string | null;
  }>
> {
  const res = await fetch(`${API}/pagos?socioId=${socioId}`, { headers: conToken(token) });
  return (await res.json()) as Array<{
    id: string;
    monto: string;
    metodoPago: string;
    estado: string;
    membresiaId: string | null;
  }>;
}

export function tokenDeResetDelUltimoMail(): string {
  const token = obtenerUltimoTokenDeReset();
  if (!token) throw new Error("No se generó ningún token de reset todavía");
  return token;
}
