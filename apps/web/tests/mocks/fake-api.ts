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

interface FakeProfesor {
  id: string;
  gimnasioId: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  activo: boolean;
}
interface FakeActividad {
  id: string;
  gimnasioId: string;
  nombre: string;
  descripcion: string | null;
  cupo: number | null;
  activa: boolean;
}
interface FakeSocio {
  id: string;
  gimnasioId: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  fechaIngreso: string;
  activo: boolean;
  createdAt: string;
}
interface FakeVinculo {
  id: string;
  gimnasioId: string;
  actividadId: string;
  profesorId: string;
}
interface FakeTipoMembresia {
  id: string;
  gimnasioId: string;
  actividadId: string;
  nombre: string;
  precio: string;
  duracionDias: number;
  cantidadClases: number | null;
  activo: boolean;
}
interface FakeMembresia {
  id: string;
  gimnasioId: string;
  socioId: string;
  actividadId: string;
  tipoMembresiaId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "ACTIVA" | "VENCIDA" | "CANCELADA";
  createdAt: string;
}
type EstadoPago = "PENDIENTE" | "PAGADO" | "RECHAZADO";
interface FakePago {
  id: string;
  gimnasioId: string;
  socioId: string;
  membresiaId: string | null;
  monto: string;
  fecha: string;
  metodoPago: string;
  estado: EstadoPago;
  concepto: string | null;
  createdAt: string;
}

const estado = {
  gimnasios: [] as FakeGimnasio[],
  usuarios: [] as FakeUsuario[],
  profesores: [] as FakeProfesor[],
  actividades: [] as FakeActividad[],
  vinculos: [] as FakeVinculo[],
  socios: [] as FakeSocio[],
  tiposMembresia: [] as FakeTipoMembresia[],
  membresias: [] as FakeMembresia[],
  pagos: [] as FakePago[],
  sesiones: new Map<string, { usuarioId: string }>(),
  passwordResetTokens: [] as Array<{ token: string; usuarioId: string; expiraEn: number }>,
  // Imita REGISTRO_GIMNASIOS_HABILITADO de la API
  registroHabilitado: true,
};

export function resetFakeApi(): void {
  estado.gimnasios.length = 0;
  estado.usuarios.length = 0;
  estado.profesores.length = 0;
  estado.actividades.length = 0;
  estado.vinculos.length = 0;
  estado.socios.length = 0;
  estado.tiposMembresia.length = 0;
  estado.membresias.length = 0;
  estado.pagos.length = 0;
  estado.sesiones.clear();
  estado.passwordResetTokens.length = 0;
  estado.registroHabilitado = true;
}

// Solo para la API falsa: en la real se cambia con la variable de entorno al levantarla
export function configurarRegistroGimnasios(habilitado: boolean): void {
  estado.registroHabilitado = habilitado;
}

// Solo para tests: "lee" el token que se mandó por mail en el último forgot-password
export function obtenerUltimoTokenDeReset(): string | undefined {
  return estado.passwordResetTokens.at(-1)?.token;
}

// ───────── utilidades ─────────

const SLUGS_RESERVADOS = ["www", "api", "app", "admin", "login", "static", "assets"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// jsdom aplica CORS como un navegador (la app y la API están en orígenes distintos), así que la API
// falsa tiene que responder con este encabezado. La real solo permite FRONTEND_URL / CORS_ORIGINS.
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

// Imita el incremento de Usuario.tokenVersion: invalida todos los tokens del usuario
function cerrarSesionesDe(usuarioId: string): void {
  for (const [token, sesion] of estado.sesiones) {
    if (sesion.usuarioId === usuarioId) estado.sesiones.delete(token);
  }
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

// Un campo opcional del profesor puede faltar, ser null o ser un texto dentro del largo permitido
const opcionalValido = (valor: unknown, max: number) =>
  valor === undefined ||
  valor === null ||
  (typeof valor === "string" && valor.trim().length <= max);

const emailOpcionalValido = (valor: unknown) =>
  valor === undefined ||
  valor === null ||
  (typeof valor === "string" && /^\S+@\S+\.\S+$/.test(valor.trim()));

const opcionalesDeProfesorValidos = (cuerpo: Record<string, unknown>) =>
  opcionalValido(cuerpo.dni, 20) &&
  emailOpcionalValido(cuerpo.email) &&
  opcionalValido(cuerpo.telefono, 30) &&
  opcionalValido(cuerpo.especialidad, 80);

const textoOpcional = (valor: unknown): string | null =>
  typeof valor === "string" ? valor.trim() : null;
const emailOpcional = (valor: unknown): string | null =>
  typeof valor === "string" ? valor.trim().toLowerCase() : null;

// El cupo puede faltar, ser null (sin límite) o ser un entero mayor a 0. Un texto no vale.
const cupoValido = (valor: unknown) =>
  valor === undefined ||
  valor === null ||
  (typeof valor === "number" && Number.isInteger(valor) && valor > 0);

const descripcionValida = (valor: unknown) =>
  valor === undefined ||
  valor === null ||
  (typeof valor === "string" && valor.trim().length <= 500);

// Socios: el DNI es obligatorio (7 u 8 dígitos) y la fecha de nacimiento no puede ser futura
const DNI_SOCIO = /^\d{7,8}$/;
const DNI_DUPLICADO = "Ya existe un socio con ese DNI en este gimnasio";
const fechaOpcionalValida = (valor: unknown) =>
  valor === undefined ||
  valor === null ||
  (typeof valor === "string" &&
    !Number.isNaN(new Date(valor).getTime()) &&
    new Date(valor) <= new Date());
const opcionalesDeSocioValidos = (cuerpo: Record<string, unknown>) =>
  emailOpcionalValido(cuerpo.email) &&
  opcionalValido(cuerpo.telefono, 30) &&
  fechaOpcionalValida(cuerpo.fechaNacimiento);
// La API guarda la fecha como medianoche UTC y la devuelve en ISO
const fechaOpcional = (valor: unknown): string | null =>
  typeof valor === "string" ? new Date(valor).toISOString() : null;
const dniRepetido = (gimnasioId: string, dni: string, excepto?: string) =>
  estado.socios.some((s) => s.gimnasioId === gimnasioId && s.dni === dni && s.id !== excepto);

const vinculoConProfesor = (vinculo: FakeVinculo) => ({
  ...vinculo,
  profesor: estado.profesores.find((p) => p.id === vinculo.profesorId),
});

// ───── membresías y pagos ─────
const METODOS_PAGO = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "MERCADO_PAGO"];
const ESTADOS_PAGO: EstadoPago[] = ["PENDIENTE", "PAGADO", "RECHAZADO"];
const MONTO = /^\d{1,8}(?:\.\d{1,2})?$/;
const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;
const fechaIsoValida = (valor: unknown) =>
  typeof valor === "string" && !Number.isNaN(new Date(valor).getTime());

// Igual que apps/api/src/modules/membresias/vigencia.ts: días calendario UTC
function estadoVigencia(membresia: FakeMembresia): "AL_DIA" | "POR_VENCER" | "VENCIDA" | null {
  if (membresia.estado === "CANCELADA") return null;
  const fin = new Date(membresia.fechaFin);
  const ahora = new Date();
  const diaFin = Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate());
  const hoy = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  const diasRestantes = Math.floor((diaFin - hoy) / MILISEGUNDOS_POR_DIA);
  if (diasRestantes < 0) return "VENCIDA";
  if (diasRestantes <= 7) return "POR_VENCER";
  return "AL_DIA";
}

// "2026-11": el mes calendario en la zona por defecto de la API (ZONA_HORARIA)
const mesEnArgentina = (fecha: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).format(fecha);

function membresiaConRelaciones(membresia: FakeMembresia) {
  const socio = estado.socios.find((s) => s.id === membresia.socioId);
  const actividad = estado.actividades.find((a) => a.id === membresia.actividadId);
  const tipo = estado.tiposMembresia.find((t) => t.id === membresia.tipoMembresiaId);
  return {
    ...membresia,
    estadoVigencia: estadoVigencia(membresia),
    socio: socio && { id: socio.id, nombre: socio.nombre, apellido: socio.apellido },
    actividad: actividad && { id: actividad.id, nombre: actividad.nombre },
    tipoMembresia: tipo && { id: tipo.id, nombre: tipo.nombre, duracionDias: tipo.duracionDias },
  };
}

function pagoConRelaciones(pago: FakePago) {
  const socio = estado.socios.find((s) => s.id === pago.socioId);
  const membresia = estado.membresias.find((m) => m.id === pago.membresiaId);
  const actividad = estado.actividades.find((a) => a.id === membresia?.actividadId);
  const tipo = estado.tiposMembresia.find((t) => t.id === membresia?.tipoMembresiaId);
  return {
    ...pago,
    socio: socio && { id: socio.id, nombre: socio.nombre, apellido: socio.apellido },
    membresia:
      membresia && actividad && tipo
        ? {
            id: membresia.id,
            actividad: { id: actividad.id, nombre: actividad.nombre },
            tipoMembresia: { id: tipo.id, nombre: tipo.nombre },
          }
        : null,
  };
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

// Filtros de GET /pagos (también los usa la exportación): la lista ordenada o un 400
function pagosFiltrados(actual: Autenticado, request: Request): FakePago[] | Response {
  const params = new URL(request.url).searchParams;
  const socioId = params.get("socioId");
  const estadoPago = params.get("estado");
  const desde = params.get("desde");
  const hasta = params.get("hasta");
  if (
    (socioId !== null && !UUID.test(socioId)) ||
    (estadoPago !== null && !ESTADOS_PAGO.includes(estadoPago as EstadoPago)) ||
    (desde !== null && !fechaIsoValida(desde)) ||
    (hasta !== null && !fechaIsoValida(hasta))
  ) {
    return errorDeValidacion();
  }

  return estado.pagos
    .filter((p) => p.gimnasioId === actual.gimnasio.id)
    .filter((p) => socioId === null || p.socioId === socioId)
    .filter((p) => estadoPago === null || p.estado === estadoPago)
    .filter((p) => desde === null || new Date(p.fecha) >= new Date(desde))
    .filter((p) => hasta === null || new Date(p.fecha) <= new Date(hasta))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt));
}

// Mismo formato que apps/api/src/modules/pagos/pagos.csv.ts (zona horaria por defecto de la API)
function pagosACsv(pagos: FakePago[]): string {
  const ETIQUETAS: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TARJETA: "Tarjeta",
    TRANSFERENCIA: "Transferencia",
    MERCADO_PAGO: "Mercado Pago",
    PENDIENTE: "Pendiente",
    PAGADO: "Pagado",
    RECHAZADO: "Rechazado",
  };
  const fecha = (iso: string) => {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(iso));
    const p = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((parte) => parte.type === tipo)?.value ?? "";
    return `${p("day")}/${p("month")}/${p("year")} ${p("hour")}:${p("minute")}`;
  };
  const celda = (valor: string) => {
    const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
    return /[";\r\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro;
  };

  const filas = pagos.map((pago) => {
    const { socio, membresia } = pagoConRelaciones(pago);
    const concepto =
      pago.concepto ??
      (membresia
        ? `${membresia.actividad.nombre} · ${membresia.tipoMembresia.nombre}`
        : "Pago suelto");
    return [
      fecha(pago.fecha),
      socio ? `${socio.apellido}, ${socio.nombre}` : "",
      concepto,
      ETIQUETAS[pago.metodoPago],
      ETIQUETAS[pago.estado],
      pago.monto.replace(".", ","),
    ];
  });
  const encabezado = ["Fecha", "Socio", "Concepto", "Método de pago", "Estado", "Monto"];
  const lineas = [encabezado, ...filas].map((fila) => fila.map(celda).join(";"));
  return "\uFEFF" + lineas.join("\r\n") + "\r\n";
}

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
      // Se cierran todas las sesiones (incluida la actual) y se entrega una nueva
      cerrarSesionesDe(actual.usuario.id);
      return respuesta(200, sesionDe(actual.usuario, actual.gimnasio));
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
      cerrarSesionesDe(objetivo.id);
      return sinContenido();
    }),
    // Cualquier usuario con sesión puede consultar; solo los administradores modifican
    http.get(`${base}/profesores`, ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const lista = estado.profesores
        .filter((p) => p.gimnasioId === actual.gimnasio.id)
        .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
      return respuesta(200, lista);
    }),

    http.post(`${base}/profesores`, async ({ request }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;

      const cuerpo = await leerJson(request);
      if (
        !cuerpo ||
        !texto(cuerpo.nombre).trim() ||
        !texto(cuerpo.apellido).trim() ||
        !opcionalesDeProfesorValidos(cuerpo)
      ) {
        return errorDeValidacion();
      }

      const creado: FakeProfesor = {
        id: crypto.randomUUID(),
        gimnasioId: actual.gimnasio.id,
        nombre: texto(cuerpo.nombre).trim(),
        apellido: texto(cuerpo.apellido).trim(),
        dni: textoOpcional(cuerpo.dni),
        email: emailOpcional(cuerpo.email),
        telefono: textoOpcional(cuerpo.telefono),
        especialidad: textoOpcional(cuerpo.especialidad),
        activo: true,
      };
      estado.profesores.push(creado);
      return respuesta(201, creado);
    }),

    http.patch(`${base}/profesores/:id`, async ({ request, params }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const cuerpo = await leerJson(request);
      const permitidos = [
        "nombre",
        "apellido",
        "dni",
        "email",
        "telefono",
        "especialidad",
        "activo",
      ];
      if (
        !cuerpo ||
        !Object.keys(cuerpo).length ||
        Object.keys(cuerpo).some((k) => !permitidos.includes(k)) ||
        (cuerpo.nombre !== undefined && !texto(cuerpo.nombre).trim()) ||
        (cuerpo.apellido !== undefined && !texto(cuerpo.apellido).trim()) ||
        (cuerpo.activo !== undefined && typeof cuerpo.activo !== "boolean") ||
        !opcionalesDeProfesorValidos(cuerpo)
      ) {
        return errorDeValidacion();
      }

      // Otro gimnasio y "no existe" se ven igual: 404
      const objetivo = estado.profesores.find(
        (p) => p.id === id && p.gimnasioId === actual.gimnasio.id
      );
      if (!objetivo) return error(404, "Profesor no encontrado");

      if (typeof cuerpo.nombre === "string") objetivo.nombre = cuerpo.nombre.trim();
      if (typeof cuerpo.apellido === "string") objetivo.apellido = cuerpo.apellido.trim();
      // null borra el dato; si el campo no viene, no se toca
      if (cuerpo.dni !== undefined) objetivo.dni = textoOpcional(cuerpo.dni);
      if (cuerpo.email !== undefined) objetivo.email = emailOpcional(cuerpo.email);
      if (cuerpo.telefono !== undefined) objetivo.telefono = textoOpcional(cuerpo.telefono);
      if (cuerpo.especialidad !== undefined) {
        objetivo.especialidad = textoOpcional(cuerpo.especialidad);
      }
      if (typeof cuerpo.activo === "boolean") objetivo.activo = cuerpo.activo;
      return respuesta(200, objetivo);
    }),
    // Cualquier usuario con sesión puede consultar; solo los administradores modifican
    http.get(`${base}/actividades`, ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const lista = estado.actividades
        .filter((a) => a.gimnasioId === actual.gimnasio.id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      return respuesta(200, lista);
    }),

    http.post(`${base}/actividades`, async ({ request }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;

      const cuerpo = await leerJson(request);
      if (
        !cuerpo ||
        !texto(cuerpo.nombre).trim() ||
        texto(cuerpo.nombre).trim().length > 80 ||
        !descripcionValida(cuerpo.descripcion) ||
        !cupoValido(cuerpo.cupo)
      ) {
        return errorDeValidacion();
      }

      const creada: FakeActividad = {
        id: crypto.randomUUID(),
        gimnasioId: actual.gimnasio.id,
        nombre: texto(cuerpo.nombre).trim(),
        descripcion: textoOpcional(cuerpo.descripcion),
        cupo: typeof cuerpo.cupo === "number" ? cuerpo.cupo : null,
        activa: true,
      };
      estado.actividades.push(creada);
      return respuesta(201, creada);
    }),

    http.patch(`${base}/actividades/:id`, async ({ request, params }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const cuerpo = await leerJson(request);
      const permitidos = ["nombre", "descripcion", "cupo", "activa"];
      if (
        !cuerpo ||
        !Object.keys(cuerpo).length ||
        Object.keys(cuerpo).some((k) => !permitidos.includes(k)) ||
        (cuerpo.nombre !== undefined &&
          (!texto(cuerpo.nombre).trim() || texto(cuerpo.nombre).trim().length > 80)) ||
        (cuerpo.activa !== undefined && typeof cuerpo.activa !== "boolean") ||
        !descripcionValida(cuerpo.descripcion) ||
        !cupoValido(cuerpo.cupo)
      ) {
        return errorDeValidacion();
      }

      // Otro gimnasio y "no existe" se ven igual: 404
      const objetivo = estado.actividades.find(
        (a) => a.id === id && a.gimnasioId === actual.gimnasio.id
      );
      if (!objetivo) return error(404, "Actividad no encontrada");

      if (typeof cuerpo.nombre === "string") objetivo.nombre = cuerpo.nombre.trim();
      // null borra el dato; si el campo no viene, no se toca
      if (cuerpo.descripcion !== undefined) {
        objetivo.descripcion = textoOpcional(cuerpo.descripcion);
      }
      if (cuerpo.cupo !== undefined) {
        objetivo.cupo = typeof cuerpo.cupo === "number" ? cuerpo.cupo : null;
      }
      if (typeof cuerpo.activa === "boolean") objetivo.activa = cuerpo.activa;
      return respuesta(200, objetivo);
    }),
    http.get(`${base}/actividades/:id`, ({ request, params }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const actividad = estado.actividades.find(
        (a) => a.id === id && a.gimnasioId === actual.gimnasio.id
      );
      return actividad ? respuesta(200, actividad) : error(404, "Actividad no encontrada");
    }),

    http.get(`${base}/actividades/:id/profesores`, ({ request, params }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();
      if (!estado.actividades.some((a) => a.id === id && a.gimnasioId === actual.gimnasio.id)) {
        return error(404, "Actividad no encontrada");
      }

      const lista = estado.vinculos
        .filter((v) => v.actividadId === id && v.gimnasioId === actual.gimnasio.id)
        .map(vinculoConProfesor)
        .sort(
          (a, b) =>
            (a.profesor?.apellido ?? "").localeCompare(b.profesor?.apellido ?? "") ||
            (a.profesor?.nombre ?? "").localeCompare(b.profesor?.nombre ?? "")
        );
      return respuesta(200, lista);
    }),

    // Mismo orden que en el service real: primero lo que no existe en este gimnasio (404)
    // y después lo que existe pero no se puede (409)
    http.post(`${base}/actividades/:id/profesores`, async ({ request, params }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const cuerpo = await leerJson(request);
      if (!cuerpo || !UUID.test(texto(cuerpo.profesorId))) return errorDeValidacion();
      const profesorId = texto(cuerpo.profesorId);

      const actividad = estado.actividades.find(
        (a) => a.id === id && a.gimnasioId === actual.gimnasio.id
      );
      if (!actividad) return error(404, "Actividad no encontrada");
      const profesor = estado.profesores.find(
        (p) => p.id === profesorId && p.gimnasioId === actual.gimnasio.id
      );
      if (!profesor) return error(404, "Profesor no encontrado");

      if (!actividad.activa) return error(409, "La actividad está dada de baja");
      if (!profesor.activo) return error(409, "El profesor está dado de baja");
      if (estado.vinculos.some((v) => v.actividadId === id && v.profesorId === profesorId)) {
        return error(409, "El profesor ya está asignado a esta actividad");
      }

      const vinculo: FakeVinculo = {
        id: crypto.randomUUID(),
        gimnasioId: actual.gimnasio.id,
        actividadId: id,
        profesorId,
      };
      estado.vinculos.push(vinculo);
      return respuesta(201, vinculoConProfesor(vinculo));
    }),

    http.delete(`${base}/actividades/:id/profesores/:profesorId`, ({ request, params }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      const profesorId = String(params.profesorId);
      if (!UUID.test(id) || !UUID.test(profesorId)) return errorDeValidacion();

      const posicion = estado.vinculos.findIndex(
        (v) =>
          v.actividadId === id && v.profesorId === profesorId && v.gimnasioId === actual.gimnasio.id
      );
      if (posicion === -1) return error(404, "El profesor no está asignado a esta actividad");

      estado.vinculos.splice(posicion, 1);
      return sinContenido();
    }),
    // Métricas del inicio: cualquier usuario con sesión, solo con datos de su gimnasio
    http.get(`${base}/dashboard/resumen`, ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const gimnasioId = actual.gimnasio.id;
      const sociosActivos = estado.socios.filter(
        (s) => s.gimnasioId === gimnasioId && s.activo
      ).length;
      const ingresos = estado.pagos
        .filter(
          (p) =>
            p.gimnasioId === gimnasioId &&
            p.estado === "PAGADO" &&
            mesEnArgentina(new Date(p.fecha)) === mesEnArgentina(new Date())
        )
        .reduce((total, p) => total + Math.round(Number(p.monto) * 100), 0);
      const vencimientosProximos = estado.membresias.filter(
        (m) => m.gimnasioId === gimnasioId && estadoVigencia(m) === "POR_VENCER"
      ).length;
      return respuesta(200, {
        sociosActivos,
        ingresosMes: (ingresos / 100).toFixed(2),
        vencimientosProximos,
      });
    }),

    // ───── socios: cualquier usuario con sesión consulta, da de alta y edita; la baja es de ADMIN
    http.get(`${base}/socios`, ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const params = new URL(request.url).searchParams;
      const activo = params.get("activo");
      if (activo !== null && activo !== "true" && activo !== "false") return errorDeValidacion();
      const q = params.get("q")?.trim().toLowerCase();

      const lista = estado.socios
        .filter((s) => s.gimnasioId === actual.gimnasio.id)
        .filter((s) => activo === null || s.activo === (activo === "true"))
        .filter(
          (s) =>
            !q ||
            s.nombre.toLowerCase().includes(q) ||
            s.apellido.toLowerCase().includes(q) ||
            s.dni.includes(q)
        )
        .sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
      return respuesta(200, lista);
    }),

    http.get(`${base}/socios/:id`, ({ request, params }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const socio = estado.socios.find((s) => s.id === id && s.gimnasioId === actual.gimnasio.id);
      return socio ? respuesta(200, socio) : error(404, "Socio no encontrado");
    }),

    http.post(`${base}/socios`, async ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const cuerpo = await leerJson(request);
      if (
        !cuerpo ||
        !texto(cuerpo.nombre).trim() ||
        !texto(cuerpo.apellido).trim() ||
        !DNI_SOCIO.test(texto(cuerpo.dni).trim()) ||
        !opcionalesDeSocioValidos(cuerpo)
      ) {
        return errorDeValidacion();
      }

      const dni = texto(cuerpo.dni).trim();
      if (dniRepetido(actual.gimnasio.id, dni)) return error(409, DNI_DUPLICADO);

      const ahora = new Date().toISOString();
      const creado: FakeSocio = {
        id: crypto.randomUUID(),
        gimnasioId: actual.gimnasio.id,
        nombre: texto(cuerpo.nombre).trim(),
        apellido: texto(cuerpo.apellido).trim(),
        dni,
        email: emailOpcional(cuerpo.email),
        telefono: textoOpcional(cuerpo.telefono),
        fechaNacimiento: fechaOpcional(cuerpo.fechaNacimiento),
        fechaIngreso: ahora,
        activo: true,
        createdAt: ahora,
      };
      estado.socios.push(creado);
      return respuesta(201, creado);
    }),

    http.patch(`${base}/socios/:id`, async ({ request, params }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const cuerpo = await leerJson(request);
      const permitidos = [
        "nombre",
        "apellido",
        "dni",
        "email",
        "telefono",
        "fechaNacimiento",
        "activo",
      ];
      if (
        !cuerpo ||
        !Object.keys(cuerpo).length ||
        Object.keys(cuerpo).some((k) => !permitidos.includes(k)) ||
        (cuerpo.nombre !== undefined && !texto(cuerpo.nombre).trim()) ||
        (cuerpo.apellido !== undefined && !texto(cuerpo.apellido).trim()) ||
        (cuerpo.dni !== undefined && !DNI_SOCIO.test(texto(cuerpo.dni).trim())) ||
        (cuerpo.activo !== undefined && typeof cuerpo.activo !== "boolean") ||
        !opcionalesDeSocioValidos(cuerpo)
      ) {
        return errorDeValidacion();
      }
      if (cuerpo.activo !== undefined && actual.usuario.rol !== "ADMIN") {
        return error(403, "Solo un administrador puede dar de baja o reactivar socios");
      }

      // Otro gimnasio y "no existe" se ven igual: 404
      const objetivo = estado.socios.find(
        (s) => s.id === id && s.gimnasioId === actual.gimnasio.id
      );
      if (!objetivo) return error(404, "Socio no encontrado");

      if (typeof cuerpo.dni === "string") {
        const dni = cuerpo.dni.trim();
        if (dniRepetido(actual.gimnasio.id, dni, objetivo.id)) return error(409, DNI_DUPLICADO);
        objetivo.dni = dni;
      }
      if (typeof cuerpo.nombre === "string") objetivo.nombre = cuerpo.nombre.trim();
      if (typeof cuerpo.apellido === "string") objetivo.apellido = cuerpo.apellido.trim();
      // null borra el dato; si el campo no viene, no se toca
      if (cuerpo.email !== undefined) objetivo.email = emailOpcional(cuerpo.email);
      if (cuerpo.telefono !== undefined) objetivo.telefono = textoOpcional(cuerpo.telefono);
      if (cuerpo.fechaNacimiento !== undefined) {
        objetivo.fechaNacimiento = fechaOpcional(cuerpo.fechaNacimiento);
      }
      if (typeof cuerpo.activo === "boolean") objetivo.activo = cuerpo.activo;
      return respuesta(200, objetivo);
    }),

    http.delete(`${base}/socios/:id`, ({ request, params }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;
      const id = String(params.id);
      if (!UUID.test(id)) return errorDeValidacion();

      const objetivo = estado.socios.find(
        (s) => s.id === id && s.gimnasioId === actual.gimnasio.id
      );
      if (!objetivo) return error(404, "Socio no encontrado");
      objetivo.activo = false;
      return respuesta(200, objetivo);
    }),

    // ───── tipos de membresía: todos los consultan (también los inactivos), solo ADMIN los crea
    http.get(`${base}/tipos-membresia`, ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const actividadId = new URL(request.url).searchParams.get("actividadId");
      if (actividadId !== null && !UUID.test(actividadId)) return errorDeValidacion();

      const nombreDe = (id: string) => estado.actividades.find((a) => a.id === id)?.nombre ?? "";
      const lista = estado.tiposMembresia
        .filter((t) => t.gimnasioId === actual.gimnasio.id)
        .filter((t) => actividadId === null || t.actividadId === actividadId)
        .sort(
          (a, b) =>
            nombreDe(a.actividadId).localeCompare(nombreDe(b.actividadId), "es") ||
            a.nombre.localeCompare(b.nombre, "es")
        )
        .map((t) => ({ ...t, actividad: { id: t.actividadId, nombre: nombreDe(t.actividadId) } }));
      return respuesta(200, lista);
    }),

    http.post(`${base}/tipos-membresia`, async ({ request }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;

      const cuerpo = await leerJson(request);
      const precio = Number(cuerpo?.precio);
      if (
        !cuerpo ||
        !UUID.test(texto(cuerpo.actividadId)) ||
        !texto(cuerpo.nombre).trim() ||
        !Number.isFinite(precio) ||
        precio < 0 ||
        !MONTO.test(String(precio)) ||
        !Number.isInteger(cuerpo.duracionDias) ||
        (cuerpo.duracionDias as number) <= 0
      ) {
        return errorDeValidacion();
      }
      const actividad = estado.actividades.find(
        (a) => a.id === cuerpo.actividadId && a.gimnasioId === actual.gimnasio.id
      );
      if (!actividad) return error(404, "La actividad no existe");

      const tipo: FakeTipoMembresia = {
        id: crypto.randomUUID(),
        gimnasioId: actual.gimnasio.id,
        actividadId: actividad.id,
        nombre: texto(cuerpo.nombre).trim(),
        precio: String(precio),
        duracionDias: cuerpo.duracionDias as number,
        cantidadClases: typeof cuerpo.cantidadClases === "number" ? cuerpo.cantidadClases : null,
        activo: true,
      };
      estado.tiposMembresia.push(tipo);
      return respuesta(201, { ...tipo, actividad: { id: actividad.id, nombre: actividad.nombre } });
    }),

    // ───── membresías
    http.get(`${base}/membresias`, ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const params = new URL(request.url).searchParams;
      const socioId = params.get("socioId");
      const vigencia = params.get("vigencia");
      if (
        (socioId !== null && !UUID.test(socioId)) ||
        (vigencia !== null && !["AL_DIA", "POR_VENCER", "VENCIDA"].includes(vigencia))
      ) {
        return errorDeValidacion();
      }

      const lista = estado.membresias
        .filter((m) => m.gimnasioId === actual.gimnasio.id)
        .filter((m) => socioId === null || m.socioId === socioId)
        .filter((m) => vigencia === null || estadoVigencia(m) === vigencia)
        .sort(
          (a, b) => a.fechaFin.localeCompare(b.fechaFin) || b.createdAt.localeCompare(a.createdAt)
        )
        .map(membresiaConRelaciones);
      return respuesta(200, lista);
    }),

    // Igual que la API: crea la membresía y su pago pendiente juntos
    http.post(`${base}/membresias/inscripciones`, async ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const cuerpo = await leerJson(request);
      if (
        !cuerpo ||
        !UUID.test(texto(cuerpo.socioId)) ||
        !UUID.test(texto(cuerpo.actividadId)) ||
        !UUID.test(texto(cuerpo.tipoMembresiaId)) ||
        !METODOS_PAGO.includes(texto(cuerpo.metodoPago)) ||
        (cuerpo.fechaInicio !== undefined && !fechaIsoValida(cuerpo.fechaInicio))
      ) {
        return errorDeValidacion();
      }
      const gimnasioId = actual.gimnasio.id;
      const socio = estado.socios.find(
        (s) => s.id === cuerpo.socioId && s.gimnasioId === gimnasioId
      );
      const actividad = estado.actividades.find(
        (a) => a.id === cuerpo.actividadId && a.gimnasioId === gimnasioId
      );
      const tipo = estado.tiposMembresia.find(
        (t) => t.id === cuerpo.tipoMembresiaId && t.gimnasioId === gimnasioId
      );
      if (!socio?.activo) return error(404, "Socio inexistente o inactivo");
      if (!actividad?.activa) return error(404, "Actividad inexistente o inactiva");
      if (!tipo?.activo || tipo.actividadId !== actividad.id) {
        return error(400, "El tipo de membresía no está activo para esta actividad");
      }

      const inicio = cuerpo.fechaInicio ? new Date(texto(cuerpo.fechaInicio)) : new Date();
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + tipo.duracionDias);
      const vigentes = estado.membresias.filter(
        (m) =>
          m.actividadId === actividad.id &&
          m.estado === "ACTIVA" &&
          new Date(m.fechaInicio) <= inicio &&
          new Date(m.fechaFin) >= inicio
      );
      // Como la API: choca con cualquier membresía activa que termine después del inicio,
      // aunque empiece más tarde
      const yaInscripto = estado.membresias.some(
        (m) =>
          m.socioId === socio.id &&
          m.actividadId === actividad.id &&
          m.estado === "ACTIVA" &&
          new Date(m.fechaFin) >= inicio
      );
      if (yaInscripto) {
        return error(409, "El socio ya tiene una membresía activa para esta actividad");
      }
      if (actividad.cupo !== null && vigentes.length >= actividad.cupo) {
        return error(409, "La actividad no tiene cupo disponible");
      }

      const ahora = new Date().toISOString();
      const membresia: FakeMembresia = {
        id: crypto.randomUUID(),
        gimnasioId,
        socioId: socio.id,
        actividadId: actividad.id,
        tipoMembresiaId: tipo.id,
        fechaInicio: inicio.toISOString(),
        fechaFin: fin.toISOString(),
        estado: "ACTIVA",
        createdAt: ahora,
      };
      const pago: FakePago = {
        id: crypto.randomUUID(),
        gimnasioId,
        socioId: socio.id,
        membresiaId: membresia.id,
        monto: Number(tipo.precio).toFixed(2),
        fecha: ahora,
        metodoPago: texto(cuerpo.metodoPago),
        estado: "PENDIENTE",
        concepto: null,
        createdAt: ahora,
      };
      estado.membresias.push(membresia);
      estado.pagos.push(pago);
      return respuesta(201, {
        ...membresiaConRelaciones(membresia),
        pago: { id: pago.id, monto: pago.monto, metodoPago: pago.metodoPago, estado: pago.estado },
      });
    }),

    // ───── pagos: cualquier usuario con sesión consulta y registra
    http.get(`${base}/pagos`, ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const lista = pagosFiltrados(actual, request);
      return lista instanceof Response ? lista : respuesta(200, lista.map(pagoConRelaciones));
    }),

    // Igual que la API: reporte CSV con los filtros del listado, solo para ADMIN
    http.get(`${base}/pagos/exportar`, ({ request }) => {
      const actual = autenticarAdmin(request);
      if (actual instanceof Response) return actual;

      const lista = pagosFiltrados(actual, request);
      if (lista instanceof Response) return lista;
      return new HttpResponse(pagosACsv(lista), {
        status: 200,
        headers: {
          ...CORS,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="pagos.csv"',
        },
      });
    }),

    http.post(`${base}/pagos`, async ({ request }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const cuerpo = await leerJson(request);
      const monto = String(cuerpo?.monto ?? "").trim();
      if (
        !cuerpo ||
        !UUID.test(texto(cuerpo.socioId)) ||
        !MONTO.test(monto) ||
        Number(monto) <= 0 ||
        !METODOS_PAGO.includes(texto(cuerpo.metodoPago)) ||
        (cuerpo.estado !== undefined && !ESTADOS_PAGO.includes(cuerpo.estado as EstadoPago)) ||
        (cuerpo.fecha !== undefined && !fechaIsoValida(cuerpo.fecha))
      ) {
        return errorDeValidacion();
      }
      const socio = estado.socios.find(
        (s) => s.id === cuerpo.socioId && s.gimnasioId === actual.gimnasio.id
      );
      if (!socio) return error(404, "Socio no encontrado");

      const ahora = new Date().toISOString();
      const pago: FakePago = {
        id: crypto.randomUUID(),
        gimnasioId: actual.gimnasio.id,
        socioId: socio.id,
        membresiaId: null,
        monto: Number(monto).toFixed(2),
        fecha: cuerpo.fecha ? new Date(texto(cuerpo.fecha)).toISOString() : ahora,
        metodoPago: texto(cuerpo.metodoPago),
        estado: (cuerpo.estado as EstadoPago | undefined) ?? "PENDIENTE",
        concepto: textoOpcional(cuerpo.concepto),
        createdAt: ahora,
      };
      estado.pagos.push(pago);
      return respuesta(201, pagoConRelaciones(pago));
    }),

    // Igual que la API: solo un pago PENDIENTE pasa a PAGADO o RECHAZADO
    http.patch(`${base}/pagos/:id/estado`, async ({ request, params }) => {
      const actual = autenticar(request);
      if (actual instanceof Response) return actual;

      const cuerpo = await leerJson(request);
      if (
        !UUID.test(String(params.id)) ||
        !cuerpo ||
        Object.keys(cuerpo).length !== 1 ||
        !["PAGADO", "RECHAZADO"].includes(texto(cuerpo.estado))
      ) {
        return errorDeValidacion();
      }
      const pago = estado.pagos.find(
        (p) => p.id === params.id && p.gimnasioId === actual.gimnasio.id
      );
      if (!pago) return error(404, "Pago no encontrado");
      if (pago.estado !== "PENDIENTE") {
        return error(409, "Solo se puede cambiar el estado de un pago pendiente");
      }
      pago.estado = cuerpo.estado as EstadoPago;
      return respuesta(200, pagoConRelaciones(pago));
    }),
    http.post(`${base}/auth/forgot-password`, async ({ request }) => {
      const cuerpo = await leerJson(request);
      const gimnasioSlug = texto(cuerpo?.gimnasioSlug).trim().toLowerCase();
      const email = normalizarEmail(cuerpo?.email);
      if (!gimnasioSlug || !email) return errorDeValidacion();

      const gimnasio = estado.gimnasios.find((g) => g.slug === gimnasioSlug && g.activo);
      const usuario = estado.usuarios.find(
        (u) => u.gimnasioId === gimnasio?.id && u.email === email
      );

      if (gimnasio && usuario?.activo) {
        estado.passwordResetTokens = estado.passwordResetTokens.filter(
          (t) => t.usuarioId !== usuario.id
        );
        estado.passwordResetTokens.push({
          token: `reset-${crypto.randomUUID()}`,
          usuarioId: usuario.id,
          expiraEn: Date.now() + 60 * 60 * 1000,
        });
      }

      return respuesta(200, {
        message: "Si el email existe, vas a recibir instrucciones para restablecer tu contraseña",
      });
    }),

    http.post(`${base}/auth/reset-password`, async ({ request }) => {
      const cuerpo = await leerJson(request);
      const token = texto(cuerpo?.token);
      const nueva = texto(cuerpo?.newPassword);
      if (!token || nueva.length < 8 || nueva.length > 72) return errorDeValidacion();

      const registro = estado.passwordResetTokens.find((t) => t.token === token);
      if (!registro || registro.expiraEn < Date.now()) {
        return error(400, "El link no es válido o expiró");
      }

      const usuario = estado.usuarios.find((u) => u.id === registro.usuarioId);
      if (usuario) {
        usuario.password = nueva;
        cerrarSesionesDe(usuario.id);
      }
      estado.passwordResetTokens = estado.passwordResetTokens.filter((t) => t.token !== token);

      return respuesta(200, { message: "Contraseña actualizada correctamente" });
    }),
  ];
}
