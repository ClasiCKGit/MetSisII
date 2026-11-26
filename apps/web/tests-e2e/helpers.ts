import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { API_URL } from "./urls.ts";

// Los datos se preparan por la API (rápido y sin depender de otras pantallas); lo que se prueba
// se hace por la interfaz, como lo haría una persona.

const API = `${API_URL}/api`;

export interface Gimnasio {
  slug: string;
  nombre: string;
  email: string;
  password: string;
  token: string;
}

const unico = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export async function crearGimnasio(request: APIRequestContext): Promise<Gimnasio> {
  const id = unico();
  const datos = {
    slug: `e2e-${id}`,
    nombre: `Gimnasio E2E ${id}`,
    email: `admin@e2e-${id}.com`,
    password: "admin12345",
  };
  const res = await request.post(`${API}/auth/register-gimnasio`, {
    data: {
      gimnasio: { nombre: datos.nombre, slug: datos.slug },
      admin: { nombre: "Ana", apellido: "Admin", email: datos.email, password: datos.password },
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const { token } = (await res.json()) as { token: string };
  return { ...datos, token };
}

async function postConToken<T>(
  request: APIRequestContext,
  token: string,
  ruta: string,
  data: object
): Promise<T> {
  const res = await request.post(`${API}${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(res.ok(), `${ruta}: ${res.status()} ${await res.text()}`).toBe(true);
  return (await res.json()) as T;
}

/** Una actividad con un plan mensual. */
export async function crearActividadConPlan(
  request: APIRequestContext,
  token: string,
  nombre = "Yoga"
) {
  const actividad = await postConToken<{ id: string }>(request, token, "/actividades", {
    nombre,
  });
  const plan = await postConToken<{ id: string }>(request, token, "/tipos-membresia", {
    actividadId: actividad.id,
    nombre: "Mensual",
    precio: 12500,
    duracionDias: 30,
  });
  return { actividad, plan };
}

export async function crearSocio(
  request: APIRequestContext,
  token: string,
  datos: { nombre: string; apellido: string }
) {
  return postConToken<{ id: string }>(request, token, "/socios", {
    ...datos,
    dni: String(Math.floor(10_000_000 + Math.random() * 89_999_999)),
  });
}

export async function inscribir(
  request: APIRequestContext,
  token: string,
  datos: { socioId: string; actividadId: string; tipoMembresiaId: string; fechaInicio?: string }
) {
  return postConToken<{ id: string }>(request, token, "/membresias/inscripciones", {
    ...datos,
    metodoPago: "EFECTIVO",
  });
}

export async function crearRecepcionista(request: APIRequestContext, gimnasio: Gimnasio) {
  const email = `recepcion-${unico()}@e2e.com`;
  const password = "recepcion123";
  await postConToken(request, gimnasio.token, "/usuarios", {
    nombre: "Carla",
    apellido: "Recepción",
    email,
    password,
    rol: "RECEPCIONISTA",
  });
  return { email, password };
}

/** Inicia sesión por la pantalla de login y espera el inicio. */
export async function iniciarSesion(
  page: Page,
  credenciales: { slug: string; email: string; password: string }
) {
  await page.goto("/login");
  await page.getByLabel("Gimnasio").fill(credenciales.slug);
  await page.getByLabel("Email").fill(credenciales.email);
  await page.getByLabel("Contraseña").fill(credenciales.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { name: /^Hola, / })).toBeVisible();
}
