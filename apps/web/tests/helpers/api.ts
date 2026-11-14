import { useAuthStore } from "@/store/auth.store";

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
