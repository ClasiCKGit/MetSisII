import { http, HttpResponse } from "msw/http";

// API FALSA EN MEMORIA que imita el contrato real del backend (ver auth.md): mismas rutas, mismos
// códigos de estado y mismos mensajes de error. Así los tests ejercitan el cliente HTTP, los
// interceptores, los guards y las pantallas completas sin necesitar servidor ni base de datos.
//
// Si la API cambia, hay que actualizar este archivo. Para comprobar que sigue siendo fiel, la suite
// se puede correr contra la API real (ver docs/frontend-auth.md): TEST_API=real npm test -w apps/web

type Rol = "ADMIN" | "RECEPCIONISTA";

interface FakeGimnasio {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
}

interface FakeUsuario {
  id: string;
  gimnasioId: string;
  email: string;
  password: string; // en texto plano: es un dato de prueba, no hay base de datos
  nombre: string;
  apellido: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
}

const estado = {
  gimnasios: [] as FakeGimnasio[],
  usuarios: [] as FakeUsuario[],
  sesiones: new Map<string, { usuarioId: string }>(),
  // Imita REGISTRO_GIMNASIOS_HABILITADO de la API
  registroHabilitado: true,
};

export function resetFakeApi(): void {
  estado.gimnasios.length = 0;
  estado.usuarios.length = 0;
  estado.sesiones.clear();
  estado.registroHabilitado = true;
}

// Solo para la API falsa: en la real se cambia con la variable de entorno al levantarla
export function configurarRegistroGimnasios(habilitado: boolean): void {
  estado.registroHabilitado = habilitado;
}

// ───────── utilidades ─────────

const SLUGS_RESERVADOS = ["www", "api", "app", "admin", "login", "static", "assets"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El backend usa cors() abierto a cualquier origen. jsdom aplica CORS como un navegador (la app y la
// API están en orígenes distintos), así que la API falsa también tiene que responder con este encabezado.
const CORS = { "Access-Control-Allow-Origin": "*" };

const respuesta = (status: number, cuerpo: unknown) =>
  HttpResponse.json(cuerpo as object, { status, headers: CORS });
const sinContenido = () => new HttpResponse(null, { status: 204, headers: CORS });
const error = (status: number, mensaje: string) => respuesta(status, { error: mensaje });
const errorDeValidacion = () => respuesta(400, { error: "Error de validación", details: {} });

async function leerJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const cuerpo: unknown = await request.json();
    return typeof cuerpo === "object" && cuerpo !== null
      ? (cuerpo as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");
const normalizarEmail = (valor: unknown) => texto(valor).trim().toLowerCase();

function perfilPublico(usuario: FakeUsuario) {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    rol: usuario.rol,
  };
}

function usuarioDeLista(usuario: FakeUsuario) {
  return { ...perfilPublico(usuario), activo: usuario.activo, createdAt: usuario.createdAt };
}

function sesionDe(usuario: FakeUsuario, gimnasio: FakeGimnasio) {
  const token = `token-${crypto.randomUUID()}`;
  estado.sesiones.set(token, { usuarioId: usuario.id });
  return {
    token,
    usuario: perfilPublico(usuario),
    gimnasio: { id: gimnasio.id, nombre: gimnasio.nombre, slug: gimnasio.slug },
  };
}

type Autenticado = { usuario: FakeUsuario; gimnasio: FakeGimnasio };

// Imita el middleware authenticate: devuelve el usuario, o la respuesta de error que corresponda
function autenticar(request: Request): Autenticado | Response {
  const encabezado = request.headers.get("authorization");
  if (!encabezado?.startsWith("Bearer ")) return error(401, "Falta el token de autenticación");

  const sesion = estado.sesiones.get(encabezado.slice("Bearer ".length));
  if (!sesion) return error(401, "Token inválido o expirado");

  const usuario = estado.usuarios.find((u) => u.id === sesion.usuarioId);
  const gimnasio = estado.gimnasios.find((g) => g.id === usuario?.gimnasioId);
  if (!usuario || !gimnasio || !usuario.activo || !gimnasio.activo) {
    return error(401, "Usuario inactivo o inexistente");
  }
  return { usuario, gimnasio };
}

function autenticarAdmin(request: Request): Autenticado | Response {
  const resultado = autenticar(request);
  if (resultado instanceof Response) return resultado;
  if (resultado.usuario.rol !== "ADMIN") {
    return error(403, "No tenés permisos para realizar esta acción");
  }
  return resultado;
}

const crearUsuario = (datos: Omit<FakeUsuario, "id" | "createdAt" | "activo">): FakeUsuario => {
  const usuario: FakeUsuario = {
    ...datos,
    id: crypto.randomUUID(),
    activo: true,
    createdAt: new Date().toISOString(),
  };
  estado.usuarios.push(usuario);
  return usuario;
};

// ───────── handlers ─────────

export function crearHandlers(apiUrl: string) {
  const base = `${apiUrl}/api`;

  return [
    // Preflight de CORS: el navegador lo envía antes de las peticiones con Authorization o JSON
    http.options(`${base}/*`, () => {
      return new HttpResponse(null, {
        status: 204,
        headers: {
          ...CORS,
          "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "authorization, content-type",
        },
      });
    }),

    http.post(`${base}/auth/login`, async ({ request }) => {
      const cuerpo = await leerJson(request);
      if (
        !cuerpo ||
        !texto(cuerpo.gimnasioSlug) ||
        !texto(cuerpo.email) ||
        !texto(cuerpo.password)
      ) {
        return errorDeValidacion();
      }

      const gimnasio = estado.gimnasios.find(
        (g) => g.slug === texto(cuerpo.gimnasioSlug).trim().toLowerCase() && g.activo
      );
      const usuario = estado.usuarios.find(
        (u) => u.gimnasioId === gimnasio?.id && u.email === normalizarEmail(cuerpo.email)
      );

      // Un único mensaje para todos los casos: no revela qué falló
      if (!gimnasio || !usuario || !usuario.activo || usuario.password !== texto(cuerpo.password)) {
        return error(401, "Credenciales inválidas");
      }
      return respuesta(200, sesionDe(usuario, gimnasio));
    }),

    http.get(`${base}/auth/config`, () =>
      respuesta(200, { registroGimnasiosHabilitado: estado.registroHabilitado })
    ),

    http.post(`${base}/auth/register-gimnasio`, async ({ request }) => {
      if (!estado.registroHabilitado) {
        return error(403, "El registro de gimnasios está deshabilitado");
      }
      const cuerpo = await leerJson(request);
      const gimnasio = cuerpo?.gimnasio as Record<string, unknown> | undefined;
      const admin = cuerpo?.admin as Record<string, unknown> | undefined;
      if (!gimnasio || !admin) return errorDeValidacion();

      const slug = texto(gimnasio.slug).trim().toLowerCase();
      const slugValido =
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
        slug.length >= 3 &&
        slug.length <= 40 &&
        !SLUGS_RESERVADOS.includes(slug);
      const datosValidos =
        texto(gimnasio.nombre).trim().length >= 2 &&
        texto(admin.nombre).trim() &&
        texto(admin.apellido).trim() &&
        normalizarEmail(admin.email).includes("@") &&
        texto(admin.password).length >= 8 &&
        texto(admin.password).length <= 72;
      if (!slugValido || !datosValidos) return errorDeValidacion();

      if (estado.gimnasios.some((g) => g.slug === slug)) {
        return error(409, "Ese identificador de gimnasio ya está en uso");
      }

      const nuevo: FakeGimnasio = {
        id: crypto.randomUUID(),
        nombre: texto(gimnasio.nombre).trim(),
        slug,
        activo: true,
      };
      estado.gimnasios.push(nuevo);
      const primerAdmin = crearUsuario({
        gimnasioId: nuevo.id,
        email: normalizarEmail(admin.email),
        password: texto(admin.password),
        nombre: texto(admin.nombre).trim(),
        apellido: texto(admin.apellido).trim(),
        rol: "ADMIN",
      });
      return respuesta(201, sesionDe(primerAdmin, nuevo));
    }),

    http.get(`${base}/auth/me`, ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;
      const { usuario, gimnasio } = actual;
      return respuesta(200, {
        usuario: perfilPublico(usuario),
        gimnasio: { id: gimnasio.id, nombre: gimnasio.nombre, slug: gimnasio.slug },
      });
    }),

    http.post(`${base}/auth/change-password`, async ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;
      const cuerpo = await leerJson(request);
      const actualPassword = texto(cuerpo?.currentPassword);
      const nueva = texto(cuerpo?.newPassword);
      if (!actualPassword || nueva.length < 8 || nueva.length > 72) return errorDeValidacion();

      // 400 y no 401: el frontend interpreta un 401 como sesión vencida
      if (actualPassword !== actual.usuario.password) {
        return error(400, "La contraseña actual es incorrecta");
      }
      if (actualPassword === nueva) {
        return error(400, "La nueva contraseña tiene que ser distinta de la actual");
      }
      actual.usuario.password = nueva;
      return sinContenido();
    }),

    http.get(`${base}/usuarios`, ({ request }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;

      const lista = estado.usuarios
        .filter((u) => u.gimnasioId === actual.gimnasio.id)
        .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
      return respuesta(200, lista.map(usuarioDeLista));
    }),

    http.post(`${base}/usuarios`, async ({ request }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;

      const cuerpo = await leerJson(request);
      const rol = cuerpo?.rol === undefined ? "RECEPCIONISTA" : cuerpo.rol;
      const valido =
        texto(cuerpo?.nombre).trim() &&
        texto(cuerpo?.apellido).trim() &&
        normalizarEmail(cuerpo?.email).includes("@") &&
        texto(cuerpo?.password).length >= 8 &&
        (rol === "ADMIN" || rol === "RECEPCIONISTA");
      if (!valido) return errorDeValidacion();

      const email = normalizarEmail(cuerpo?.email);
      if (estado.usuarios.some((u) => u.gimnasioId === actual.gimnasio.id && u.email === email)) {
        return error(
          409,
          "Ya existe un usuario con ese email en este gimnasio (puede estar desactivado)"
        );
      }
      const creado = crearUsuario({
        gimnasioId: actual.gimnasio.id,
        email,
        password: texto(cuerpo?.password),
        nombre: texto(cuerpo?.nombre).trim(),
        apellido: texto(cuerpo?.apellido).trim(),
        rol: rol as Rol,
      });
      return respuesta(201, usuarioDeLista(creado));
    }),

    http.patch(`${base}/usuarios/:id`, async ({ request, params }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const cuerpo = await leerJson(request);
      const permitidos = ["nombre", "apellido", "rol", "activo"];
      if (
        !cuerpo ||
        !Object.keys(cuerpo).length ||
        Object.keys(cuerpo).some((k) => !permitidos.includes(k))
      ) {
        return errorDeValidacion();
      }

      // Otro gimnasio y "no existe" se ven igual: 404
      const objetivo = estado.usuarios.find(
        (u) => u.id === id && u.gimnasioId === actual.gimnasio.id
      );
      if (!objetivo) return error(404, "Usuario no encontrado");

      // Un administrador no puede quitarse el rol ni desactivarse: así siempre queda uno activo
      if (id === actual.usuario.id) {
        const cambiaSuRol = cuerpo.rol !== undefined && cuerpo.rol !== objetivo.rol;
        if (cambiaSuRol || cuerpo.activo === false) {
          return error(409, "No podés desactivarte ni cambiar tu propio rol");
        }
      }

      if (typeof cuerpo.nombre === "string") objetivo.nombre = cuerpo.nombre.trim();
      if (typeof cuerpo.apellido === "string") objetivo.apellido = cuerpo.apellido.trim();
      if (cuerpo.rol === "ADMIN" || cuerpo.rol === "RECEPCIONISTA") objetivo.rol = cuerpo.rol;
      if (typeof cuerpo.activo === "boolean") objetivo.activo = cuerpo.activo;
      return respuesta(200, usuarioDeLista(objetivo));
    }),

    http.post(`${base}/usuarios/:id/reset-password`, async ({ request, params }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const cuerpo = await leerJson(request);
      const password = texto(cuerpo?.password);
      if (password.length < 8 || password.length > 72) return errorDeValidacion();

      // La contraseña propia se cambia con la actual (POST /auth/change-password)
      if (id === actual.usuario.id) {
        return error(
          409,
          "Para cambiar tu propia contraseña usá el cambio de contraseña con tu contraseña actual"
        );
      }
      const objetivo = estado.usuarios.find(
        (u) => u.id === id && u.gimnasioId === actual.gimnasio.id
      );
      if (!objetivo) return error(404, "Usuario no encontrado");

      objetivo.password = password;
      return sinContenido();
    }),
  ];
}
