# Socios (backend)

Documentación del módulo `socios` de `apps/api` (Epic 2, FIT-4): qué endpoints expone, qué reglas valida y cómo mantiene el aislamiento entre gimnasios. Incluye el endpoint de resumen del inicio (`/api/dashboard/resumen`).

El aislamiento en sí (`req.db`, `TENANT_RULES`, `authenticate`, `requireRole`) está explicado en `docs/backend/auth.md`; acá solo se describe cómo lo usa este módulo. El modelo de datos completo está en `docs/backend/database.md`. La parte del frontend está en `docs/frontend/socios.md`.

---

## 1. Resumen

- Un **socio** es una persona que entrena en el gimnasio. Es un registro administrativo: no tiene usuario ni inicia sesión.
- El **DNI es obligatorio y único por gimnasio**: dos gimnasios pueden tener un socio con el mismo DNI, pero dentro de un gimnasio no se repite, ni siquiera con un socio dado de baja.
- Permisos:
  - **Cualquier usuario autenticado** (`ADMIN` o `RECEPCIONISTA`) puede consultar, dar de alta y editar los datos de un socio. Es tarea diaria de la recepción.
  - **Solo `ADMIN`** puede dar de baja o reactivar (`DELETE`, o `PATCH` con `activo`). Un recepcionista recibe `403`.
- Los socios **no se borran**: se dan de baja con `activo: false`. Así se conserva su historial de membresías y pagos.
- Todas las consultas pasan por `req.db`: un socio de otro gimnasio responde `404`, igual que uno inexistente.

| Ticket | Qué agregó |
|---|---|
| FIT-48 | CRUD de socios en la API (`/api/socios`), con DNI único por gimnasio |
| FIT-52 | Tests de aislamiento y permisos; ajustes del schema (campos no permitidos, `null` para borrar opcionales, baja solo para `ADMIN`) |
| FIT-72 | `GET /api/dashboard/resumen`: socios activos, ingresos del mes y vencimientos próximos |

---

## 2. Endpoints (`/api/socios`)

| Ruta | Rol | Qué hace | Éxito |
|---|---|---|---|
| `GET /api/socios` | Cualquiera | Lista los socios del gimnasio, ordenados por apellido y nombre. Acepta filtros (ver abajo). | `200` |
| `GET /api/socios/:id` | Cualquiera | Devuelve un socio | `200` |
| `POST /api/socios` | Cualquiera | Da de alta un socio | `201` |
| `PATCH /api/socios/:id` | Cualquiera; con `activo`, solo `ADMIN` | Actualiza los campos enviados | `200` |
| `DELETE /api/socios/:id` | `ADMIN` | Da de baja al socio (`activo: false`). **No borra la fila.** Devuelve el socio actualizado. | `200` |

### Filtros del listado

| Parámetro | Valores | Efecto |
|---|---|---|
| `activo` | `true` / `false` | Solo activos o solo dados de baja. Sin el parámetro, devuelve todos. Otro valor responde `400`. |
| `q` | Texto (1 a 100 caracteres) | Busca en nombre y apellido (sin distinguir mayúsculas) y en el DNI (coincidencia parcial). |

Ejemplo: `GET /api/socios?activo=true&q=perez`.

### Forma de un socio en las respuestas

```json
{
  "id": "uuid",
  "gimnasioId": "uuid",
  "nombre": "Lucía",
  "apellido": "Fernández",
  "dni": "32456789",
  "email": "lucia.fernandez@mail.com",
  "telefono": "291-7778888",
  "fechaNacimiento": "1990-05-20T00:00:00.000Z",
  "fechaIngreso": "2026-10-31T15:00:00.000Z",
  "activo": true,
  "createdAt": "2026-10-31T15:00:00.000Z",
  "updatedAt": "2026-10-31T15:00:00.000Z"
}
```

`fechaIngreso` la pone la base al crear el socio (`@default(now())`); no se envía en el body.

### Bodies

**`POST`** (`createSocioSchema`):

| Campo | Obligatorio | Regla |
|---|---|---|
| `nombre`, `apellido` | Sí | Texto de 1 a 60 caracteres, sin espacios al borde |
| `dni` | Sí | 7 u 8 dígitos, sin puntos (`/^\d{7,8}$/`) |
| `email` | No | Email válido; se guarda en minúsculas (reusa `emailSchema` de auth) |
| `telefono` | No | Hasta 30 caracteres |
| `fechaNacimiento` | No | Fecha (`"1990-05-20"` o ISO); no puede ser futura |

Un `gimnasioId` en el body se ignora: el socio siempre queda en el gimnasio de quien lo da de alta.

**`PATCH`** (`updateSocioSchema`, objeto **estricto**):

- Acepta los mismos campos que el alta, todos opcionales, más `activo` (booleano).
- **Omitir un campo no lo toca; mandar `null` borra un dato opcional** (`email`, `telefono`, `fechaNacimiento`).
- Un campo que no está en la lista responde `400` (por ejemplo `gimnasioId` o `fechaIngreso`).
- Un body vacío responde `400` ("Enviá al menos un campo para actualizar").
- Si viene `activo` y quien edita no es `ADMIN`, responde `403` antes de tocar nada.

---

## 3. Aislamiento por gimnasio

- `Socio` está registrado en `TENANT_RULES` (`config/tenant.ts`) con `field: "gimnasioId"`, así que todas las operaciones de `req.db.socio` filtran por el gimnasio de la sesión, incluidos `count` y `update`.
- El service no recibe el `gimnasioId` por parámetro para filtrar: confía en `req.db`. En el `create` se pasa `actor.gimnasioId`, pero la extensión lo fuerza igual.
- Un `findUnique` de un socio de otro gimnasio devuelve `null` → `404 Socio no encontrado`. Un `update` sobre un socio de otro gimnasio da `P2025` → `404`. En ningún caso se modifica el socio ajeno (lo verifican los tests).
- La restricción `@@unique([gimnasioId, dni])` está en la base: dos altas simultáneas con el mismo DNI no pueden crear dos filas; una recibe `409`.

---

## 4. Errores

| Situación | Código | Mensaje |
|---|---|---|
| Sin token o token inválido | `401` | De `authenticate` |
| Recepcionista hace `DELETE` | `403` | De `requireRole` |
| Recepcionista hace `PATCH` con `activo` | `403` | `Solo un administrador puede dar de baja o reactivar socios` |
| Body o query inválidos, id que no es UUID | `400` | `Error de validación` con `details` |
| Socio inexistente o de otro gimnasio | `404` | `Socio no encontrado` |
| DNI repetido en el gimnasio (alta o edición) | `409` | `Ya existe un socio con ese DNI en este gimnasio` |

El `409` y el `404` los traduce el propio service (`P2002` y `P2025` de Prisma) para dar un mensaje específico, en lugar del genérico del `errorHandler`.

---

## 5. Resumen del inicio (`/api/dashboard/resumen`)

| Ruta | Rol | Qué devuelve |
|---|---|---|
| `GET /api/dashboard/resumen` | Cualquiera | `{ "sociosActivos": number, "ingresosMes": string, "vencimientosProximos": number }` |

Las tres métricas salen de `req.db`, así que nunca incluyen datos de otro gimnasio:

- **`sociosActivos`**: `socio.count({ where: { activo: true } })`.
- **`ingresosMes`**: suma (`aggregate`) de los pagos `PAGADO` cuya `fecha` cae en el mes calendario en curso, como texto con dos decimales (`"1500.75"`, `"0.00"` si no hay), igual que los montos de pagos. "El mes" se calcula en la zona horaria `ZONA_HORARIA` (por defecto `America/Argentina/Buenos_Aires`) con `rangoDelMes` de `src/utils/fechas.ts`: el servidor corre en UTC y, sin esto, entre las 21:00 y las 24:00 del último día del mes los pagos contarían para el mes siguiente.
- **`vencimientosProximos`**: membresías no canceladas **ni renovadas** con vigencia `POR_VENCER` (vencen hoy o en los próximos 7 días). Usa `rangoPorVencer` de `membresias/vigencia.ts`, la misma regla de días UTC que `estadoVigencia`, así que coincide con `GET /api/membresias?vigencia=POR_VENCER` (un test unitario lo verifica en los bordes).

---

## 6. Mapa de archivos

```text
apps/api/src/modules/socios/
├── socios.routes.ts      # rutas; requireRole("ADMIN") solo en DELETE
├── socios.controller.ts  # valida params y query con Zod, llama al service
├── socios.service.ts     # consultas con req.db; 403 por activo, 404 y 409 con mensaje propio
└── socios.schema.ts      # createSocioSchema, updateSocioSchema (estricto), listSociosQuerySchema

apps/api/src/modules/dashboard/
├── dashboard.routes.ts   # GET /resumen, con authenticate
├── dashboard.controller.ts
├── dashboard.service.ts  # obtenerResumen: conteo de socios activos
└── dashboard.types.ts    # ResumenDashboard

apps/api/tests/integration/
├── socios.test.ts        # 25 tests: permisos, filtros, validaciones, 404/409, aislamiento
└── dashboard.test.ts     # 401, ambos roles, conteo por gimnasio
```

Las rutas se montan en `app.ts` bajo `/api/socios` y `/api/dashboard`.

El seed (`prisma/seed/gimnasios.ts`) crea dos socios en cada gimnasio: Juan Pérez y Lucía Fernández en FitZone (con membresías y pagos de ejemplo), y Martín López y Valeria Gómez en PowerGym. Sirven para comprobar a mano el aislamiento.

---

## 7. Tests

`tests/integration/socios.test.ts` sigue la lista de `docs/backend/testing-backend.md` para cada endpoint:

- `401` sin sesión y `403` para el recepcionista que intenta dar de baja o reactivar (con el socio intacto en la base).
- Listado: solo el propio gimnasio, orden por apellido y nombre, filtro `activo`, búsqueda por nombre, apellido o DNI, y `400` con un `activo` inválido.
- Alta: queda en el gimnasio de quien la hace aunque se mande otro `gimnasioId`, normaliza email y espacios, `409` por DNI repetido (también contra un socio dado de baja), mismo DNI permitido en otro gimnasio y dos altas simultáneas.
- Edición: campos parciales, `null` borra opcionales, baja y reactivación, `409` por DNI de otro socio, `400` con body vacío o id inválido, y `404` sobre un socio de otro gimnasio **sin modificarlo**.
- Baja: no borra la fila, `404` sobre otro gimnasio sin modificarlo.

---

## 8. Pendientes

- **Membresías e historial de pagos del socio** (FIT-51, en curso): el detalle muestra membresías con su vigencia calculada (ver [Membresías](membresias.md)) y el historial de pagos sigue pendiente de integrarse en la vista (ver [Pagos](pagos.md)).
- **Ingresos del mes y vencimientos próximos** en `/api/dashboard/resumen` (resto de FIT-72), también a la espera de FIT-6.
- El listado no está paginado. Con pocos cientos de socios por gimnasio alcanza; si crece, agregar `take`/`skip` o un cursor.
