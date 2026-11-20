# Profesores, actividades y horarios (backend)

Documentación de los módulos `profesores`, `actividades` y `horarios` de `apps/api` (Epic 3, tickets FIT-54 a FIT-59): qué endpoints exponen, qué reglas validan y cómo mantienen el aislamiento entre gimnasios.

El aislamiento en sí (`req.db`, `TENANT_RULES`, `authenticate`, `requireRole`) está explicado en `docs/backend/auth.md`; acá solo se describe cómo lo usan estos módulos. El modelo de datos completo está en `docs/backend/database.md`.

---

## 1. Resumen

- Un **profesor** es un registro administrativo: no tiene usuario ni inicia sesión.
- Una **actividad** es lo que ofrece el gimnasio (musculación, jiujitsu, crossfit…), con un cupo opcional.
- Una **asignación** (`ActividadProfesor`) indica que un profesor da una actividad. Es la tabla intermedia de la relación muchos a muchos.
- Un **horario** es un turno semanal de una actividad (día, hora de inicio y de fin). Puede tener asignado un profesor, que se indica con el id de la **asignación**, no con el del profesor. Así la base garantiza que el profesor da esa actividad (ver sección 5).
- Permisos, iguales en los tres módulos: **cualquier usuario autenticado puede consultar** y **solo `ADMIN` puede crear, modificar o borrar** (un `RECEPCIONISTA` recibe `403`).
- Profesores y actividades **no se borran**: se dan de baja con `activo` / `activa`. Las asignaciones y los horarios sí se borran físicamente.
- Todas las consultas pasan por `req.db`: un recurso de otro gimnasio responde `404`, igual que uno inexistente.

| Ticket | Qué agregó |
|---|---|
| FIT-54 | Columna `gimnasioId` en `Horario`, registro en `TENANT_RULES` y tests de aislamiento |
| FIT-55 | CRUD de profesores (`/api/profesores`) |
| FIT-56 | CRUD de actividades (`/api/actividades`) |
| FIT-57 | Asignar y quitar profesores de una actividad (`/api/actividades/:id/profesores`) |
| FIT-58 | CRUD de horarios (`/api/horarios`), con o sin profesor |
| FIT-59 | Validación de que el profesor de un horario dé esa actividad |
| FIT-60 | Frontend de gestión de profesores. **Pendiente**: todavía no hay código. |

---

## 2. Profesores (`/api/profesores`)

| Ruta | Rol | Qué hace | Éxito |
|---|---|---|---|
| `GET /api/profesores` | Cualquiera | Lista los profesores del gimnasio, ordenados por apellido y nombre. **Incluye los dados de baja.** | `200` |
| `GET /api/profesores/:id` | Cualquiera | Devuelve un profesor | `200` |
| `POST /api/profesores` | `ADMIN` | Crea un profesor | `201` |
| `PATCH /api/profesores/:id` | `ADMIN` | Actualiza los campos enviados; con `activo` se da de baja o se reactiva | `200` |

No hay `DELETE`: la baja es lógica (`"activo": false`).

**Forma de un profesor en las respuestas**

```json
{
  "id": "uuid",
  "gimnasioId": "uuid",
  "nombre": "Carlos",
  "apellido": "Pérez",
  "dni": "30111222",
  "email": "carlos@fitzone.com",
  "telefono": "291 555-1234",
  "especialidad": "Musculación",
  "activo": true,
  "createdAt": "2026-11-12T15:00:00.000Z",
  "updatedAt": "2026-11-12T15:00:00.000Z"
}
```

**Bodies**

```json
// POST /api/profesores (solo nombre y apellido son obligatorios)
{ "nombre": "Carlos", "apellido": "Pérez", "dni": "30111222", "email": "carlos@fitzone.com", "telefono": "291 555-1234", "especialidad": "Musculación" }

// PATCH /api/profesores/:id (al menos un campo; null borra un campo opcional)
{ "telefono": null, "activo": false }
```

**Validación** (`profesores.schema.ts`)

| Campo | Regla |
|---|---|
| `nombre` / `apellido` | Se recortan los espacios. Entre 1 y 60 caracteres. |
| `dni` | Opcional, hasta 20 caracteres. |
| `email` | Opcional. Usa el mismo `emailSchema` que auth: se recorta, pasa a minúsculas y tiene que ser válido. |
| `telefono` | Opcional, hasta 30 caracteres. |
| `especialidad` | Opcional, hasta 80 caracteres. |
| Campos opcionales | Si se omiten no se tocan; con `null` se borran. |
| `activo` | Solo en el `PATCH`. |

---

## 3. Actividades (`/api/actividades`)

| Ruta | Rol | Qué hace | Éxito |
|---|---|---|---|
| `GET /api/actividades` | Cualquiera | Lista las actividades del gimnasio, ordenadas por nombre. **Incluye las dadas de baja.** | `200` |
| `GET /api/actividades/:id` | Cualquiera | Devuelve una actividad | `200` |
| `POST /api/actividades` | `ADMIN` | Crea una actividad | `201` |
| `PATCH /api/actividades/:id` | `ADMIN` | Actualiza los campos enviados; con `activa` se da de baja o se reactiva | `200` |

No hay `DELETE`: la baja es lógica (`"activa": false`). Ojo: el campo es `activa`, en femenino; mandar `activo` da `400`.

**Forma de una actividad en las respuestas**

```json
{
  "id": "uuid",
  "gimnasioId": "uuid",
  "nombre": "Musculación",
  "descripcion": "Sala de musculación con aparatos",
  "cupo": 30,
  "activa": true,
  "createdAt": "2026-11-12T15:00:00.000Z",
  "updatedAt": "2026-11-12T15:00:00.000Z"
}
```

**Bodies**

```json
// POST /api/actividades (solo nombre es obligatorio)
{ "nombre": "Musculación", "descripcion": "Sala de musculación con aparatos", "cupo": 30 }

// PATCH /api/actividades/:id (al menos un campo)
{ "cupo": null, "activa": false }
```

**Validación** (`actividades.schema.ts`)

| Campo | Regla |
|---|---|
| `nombre` | Se recortan los espacios. Entre 1 y 80 caracteres. |
| `descripcion` | Opcional, hasta 500 caracteres. `null` la borra. |
| `cupo` | Opcional. Entero mayor a 0. **`null` significa "sin límite de cupo"**, y es el valor si se omite al crear. |
| `activa` | Solo en el `PATCH`. |

---

## 4. Profesores de una actividad (`/api/actividades/:id/profesores`)

Gestiona las asignaciones (`ActividadProfesor`): qué profesores dan cada actividad. Un profesor puede dar varias actividades y una actividad puede tener varios profesores.

| Ruta | Rol | Qué hace | Éxito |
|---|---|---|---|
| `GET /api/actividades/:id/profesores` | Cualquiera | Lista las asignaciones de la actividad, con el profesor incluido, ordenadas por apellido y nombre del profesor | `200` |
| `POST /api/actividades/:id/profesores` | `ADMIN` | Asigna un profesor a la actividad | `201` |
| `DELETE /api/actividades/:id/profesores/:profesorId` | `ADMIN` | Quita la asignación. **Se identifica por el id del profesor**, no por el de la asignación. | `204` |

**Forma de una asignación en las respuestas**

```json
{
  "id": "uuid de la asignación",
  "gimnasioId": "uuid",
  "actividadId": "uuid",
  "profesorId": "uuid",
  "createdAt": "2026-11-12T15:00:00.000Z",
  "profesor": { "id": "uuid", "nombre": "Carlos", "apellido": "Pérez", "...": "resto del profesor" }
}
```

El `id` de la asignación es el que se usa después como `actividadProfesorId` en los horarios.

**Body del `POST`**

```json
{ "profesorId": "uuid" }
```

**Reglas** (se comprueban en este orden)

1. La actividad tiene que existir en el gimnasio → si no, `404` "Actividad no encontrada".
2. El profesor tiene que existir en el gimnasio → si no, `404` "Profesor no encontrado".
3. La actividad tiene que estar activa → si no, `409` "La actividad está dada de baja".
4. El profesor tiene que estar activo → si no, `409` "El profesor está dado de baja".
5. No puede estar ya asignado → si no, `409` "El profesor ya está asignado a esta actividad". La base lo respalda con `@@unique([actividadId, profesorId])`.

**Al quitar una asignación, los horarios que la usaban no se borran:** quedan sin profesor (`actividadProfesorId: null`), por el `onDelete: SetNull` de la relación. Hay un test que lo verifica.

---

## 5. Horarios (`/api/horarios`)

| Ruta | Rol | Qué hace | Éxito |
|---|---|---|---|
| `GET /api/horarios` | Cualquiera | Lista los horarios del gimnasio, ordenados por día de la semana (de lunes a domingo) y hora de inicio. Acepta el filtro `?actividadId=<uuid>`. | `200` |
| `GET /api/horarios/:id` | Cualquiera | Devuelve un horario | `200` |
| `POST /api/horarios` | `ADMIN` | Crea un horario | `201` |
| `PATCH /api/horarios/:id` | `ADMIN` | Cambia el día, las horas o el profesor | `200` |
| `DELETE /api/horarios/:id` | `ADMIN` | Borra el horario (borrado físico) | `204` |

Filtrar por una actividad de otro gimnasio no da error: devuelve una lista vacía.

**Forma de un horario en las respuestas**

```json
{
  "id": "uuid",
  "gimnasioId": "uuid",
  "actividadId": "uuid",
  "diaSemana": "LUNES",
  "horaInicio": "18:00",
  "horaFin": "19:00",
  "actividadProfesorId": "uuid de la asignación o null"
}
```

**Bodies**

```json
// POST /api/horarios (actividadProfesorId es opcional; omitido o null = sin profesor)
{ "actividadId": "uuid", "diaSemana": "LUNES", "horaInicio": "18:00", "horaFin": "19:00", "actividadProfesorId": "uuid" }

// PATCH /api/horarios/:id (al menos un campo; null quita el profesor)
{ "horaFin": "20:00", "actividadProfesorId": null }
```

**Validación** (`horarios.schema.ts`)

| Campo | Regla |
|---|---|
| `actividadId` | UUID. Solo al crear: **un horario no cambia de actividad**, y mandarlo en el `PATCH` da `400`. |
| `diaSemana` | `LUNES`, `MARTES`, `MIERCOLES`, `JUEVES`, `VIERNES`, `SABADO` o `DOMINGO` (sin tildes). |
| `horaInicio` / `horaFin` | Formato `HH:MM` de 24 horas, con cero a la izquierda (`08:30`, no `8:30`). |
| Orden de las horas | `horaInicio` tiene que ser anterior a `horaFin`. Al crear lo valida el schema; en el `PATCH` lo valida el service **combinando lo enviado con lo que ya estaba guardado** (cambiar solo `horaInicio` a una hora posterior a la `horaFin` guardada da `400`). |
| `actividadProfesorId` | UUID de una **asignación** (no de un profesor) o `null`. |

Las horas se guardan como texto. La comparación funciona porque el formato `HH:MM` con ceros a la izquierda ordena igual como texto que como hora.

**Reglas al crear** (en este orden)

1. La actividad tiene que existir en el gimnasio → si no, `404` "Actividad no encontrada".
2. Si viene `actividadProfesorId`, la asignación tiene que existir en el gimnasio → si no, `404` "La asignación de profesor no existe".
3. …y tiene que ser **de la misma actividad** que el horario → si no, `409` "El profesor no está asignado a la actividad de este horario" (FIT-59).
4. La actividad tiene que estar activa → si no, `409` "La actividad está dada de baja".

**Reglas al actualizar:** el horario tiene que existir en el gimnasio (`404`); si se asigna un profesor valen las reglas 2 y 3 contra la actividad del horario; y las horas resultantes tienen que quedar en orden (`400`).

### Por qué el profesor se asigna con el id de la asignación (FIT-59)

Un horario apunta a una fila de `ActividadProfesor` y no directamente a un `Profesor`. Así, "el profesor de este horario" siempre es alguien asignado a alguna actividad. Lo que la base **no** puede garantizar es que sea a **esta** actividad: nada impide guardar un horario de Jiujitsu con la asignación "Carlos da Musculación". Esa consistencia (`asignacion.actividadId === horario.actividadId`) la valida `verificarVinculo` en `horarios.service.ts`, al crear y al actualizar.

Un profesor que da dos actividades tiene dos asignaciones distintas, y en cada horario hay que usar la de esa actividad. Hay un test que lo verifica.

---

## 6. Aislamiento por gimnasio

Los tres módulos siguen las reglas de `docs/backend/auth.md` (sección 8):

- Los services reciben `req.db` (`TenantClient`) y `req.auth` por parámetro; nunca usan el `prisma` global.
- Los ids que llegan en el body (`profesorId`, `actividadId`, `actividadProfesorId`) se buscan con `req.db` antes de usarlos. Si son de otro gimnasio, la búsqueda devuelve `null` y se responde `404` sin crear ni modificar nada.
- Los `PATCH` hacen primero un `obtener` para dar un `404` claro (si no, el `update` filtrado fallaría con el `P2025` de Prisma, que también da `404` pero con un mensaje genérico).
- **Un `gimnasioId` en el body:** en los `POST` se descarta (el schema no lo incluye y la extensión fuerza el gimnasio del usuario); en los `PATCH` los schemas son `strictObject`, así que responde `400`.

### `gimnasioId` en `Horario` (FIT-54)

Hasta FIT-54, `Horario` era la única tabla de negocio sin `gimnasioId`, y la extensión la bloqueaba (fallaba cerrado) por no estar en `TENANT_RULES`. La migración `20261112001456_horario_gimnasio_id`:

1. Agrega la columna `gimnasioId`, primero como opcional.
2. La completa en los horarios existentes con el gimnasio de su actividad.
3. La hace obligatoria y le agrega un índice y la clave foránea a `gimnasios` (con borrado en cascada).

Después, `Horario` se registró en `TENANT_RULES` con `{ field: "gimnasioId" }`, y en `tenant.test.ts` el test que verificaba el bloqueo se reemplazó por tests de aislamiento (`findMany`, `findUnique`, `update`, `delete` y `create`). El seed y las factories ahora pasan `gimnasioId` al crear horarios.

> Después de traer estos cambios hay que aplicar la migración y regenerar el cliente: `npm run db:migrate` y `npm run prisma:generate -w apps/api`.

---

## 7. Errores

Además de los generales (`401` sin sesión, `403` por rol, `400` con un id que no es UUID o un body inválido):

| Status | Mensaje | Cuándo |
|---|---|---|
| `404` | `Profesor no encontrado` | El profesor no existe o es de otro gimnasio |
| `404` | `Actividad no encontrada` | La actividad no existe o es de otro gimnasio |
| `404` | `Horario no encontrado` | El horario no existe o es de otro gimnasio |
| `404` | `El profesor no está asignado a esta actividad` | `DELETE` de una asignación que no existe |
| `404` | `La asignación de profesor no existe` | `actividadProfesorId` inexistente o de otro gimnasio |
| `409` | `La actividad está dada de baja` | Asignar un profesor o crear un horario en una actividad inactiva |
| `409` | `El profesor está dado de baja` | Asignar un profesor inactivo |
| `409` | `El profesor ya está asignado a esta actividad` | Asignación repetida |
| `409` | `El profesor no está asignado a la actividad de este horario` | La asignación es de otra actividad |
| `400` | `La hora de inicio debe ser anterior a la de fin` | Horas al revés (en el `PATCH`, sin `details`) |
| `400` | `Indicá al menos un campo para actualizar` | `PATCH` con body vacío |

---

## 8. Mapa de archivos

```
apps/api/
├── prisma/
│   ├── migrations/20261112001456_horario_gimnasio_id/   gimnasioId en horarios
│   ├── schema.prisma                Horario con gimnasioId y relación con Gimnasio
│   └── seed.ts                      Horarios del seed con gimnasioId
├── src/
│   ├── app.ts                       Monta /api/profesores, /api/actividades y /api/horarios
│   ├── config/tenant.ts             Horario registrado en TENANT_RULES
│   └── modules/
│       ├── profesores/
│       │   ├── profesores.schema.ts      Schemas de Zod (crear, actualizar, id)
│       │   ├── profesores.service.ts     listar, obtener, crear, actualizar
│       │   ├── profesores.controller.ts  Handlers HTTP
│       │   └── profesores.routes.ts      Rutas de /api/profesores
│       ├── actividades/
│       │   ├── actividades.schema.ts     Schemas de Zod (actividad y asignación de profesores)
│       │   ├── actividades.service.ts    CRUD de actividades y asignación de profesores
│       │   ├── actividades.controller.ts Handlers HTTP
│       │   └── actividades.routes.ts     Rutas de /api/actividades y /:id/profesores
│       └── horarios/
│           ├── horarios.schema.ts        Schemas de Zod (crear, actualizar, filtro, id)
│           ├── horarios.service.ts       CRUD de horarios y verificarVinculo
│           ├── horarios.controller.ts    Handlers HTTP
│           └── horarios.routes.ts        Rutas de /api/horarios
└── tests/
    ├── helpers/factories.ts         crearProfesor, crearActividad, crearVinculo, crearHorario
    └── integration/
        ├── profesores.test.ts            16 tests
        ├── actividades.test.ts           18 tests
        ├── actividad-profesores.test.ts  17 tests
        ├── horarios.test.ts              31 tests
        └── tenant.test.ts                aislamiento de Horario
```

Estos módulos no tienen `types.ts`: los tipos de entrada salen de los schemas (`z.infer`).

---

## 9. Tests

Cada archivo cubre lo que pide la convención del proyecto para todo endpoint nuevo (`docs/backend/testing-backend.md`, sección 6): `401` sin sesión, `403` para el recepcionista en las rutas de escritura, `400` con datos inválidos, el camino feliz verificando la base, y `404` sobre recursos de otro gimnasio **sin modificarlos**.

| Archivo | Qué comprueba, además de lo anterior |
|---|---|
| `profesores.test.ts` | Orden por apellido, que la lista incluya a los dados de baja, normalización del email, borrar campos con `null`, baja y reactivación. |
| `actividades.test.ts` | Orden por nombre, cupo `null` por defecto y al quitarlo, cupo inválido, baja y reactivación, `activo` (en masculino) rechazado. |
| `actividad-profesores.test.ts` | Asignación repetida, profesor o actividad dados de baja, un profesor en varias actividades, y que al quitar una asignación los horarios queden sin profesor. |
| `horarios.test.ts` | Orden por día y hora, filtro `?actividadId=`, formato y orden de las horas (también combinando con lo guardado en el `PATCH`), asignar y quitar profesor, y las dos variantes de FIT-59: asignación de otra actividad (`409`) y profesor con dos actividades. |
| `tenant.test.ts` | `Horario` aislado por `gimnasioId`: lectura, `update` y `delete` de un horario ajeno (`P2025`), y `create` que fuerza el gimnasio propio. |

Las factories nuevas (`crearProfesor`, `crearActividad`, `crearVinculo` y `crearHorario`) están descriptas en `docs/backend/testing-backend.md`, sección 5.

---

## 10. Límites conocidos y pendientes

| Tema | Detalle |
|---|---|
| Frontend | FIT-60 (gestión de profesores en la web) está pendiente. Actividades y horarios tampoco tienen pantallas todavía. |
| Superposición de horarios | No se valida: una actividad puede tener dos horarios que se pisan el mismo día. Se reevalúa si hace falta (ver `docs/decisiones-diseno.md`, horas como `String`). |
| Bajas y dependencias | Dar de baja una actividad no toca sus horarios ni sus asignaciones, y dar de baja un profesor no lo quita de los horarios donde estaba. Tampoco se impide asignar a un horario la asignación de un profesor dado de baja. |
| Sin filtros en los listados | `GET /api/profesores` y `GET /api/actividades` devuelven todo, activos e inactivos, sin paginación. El filtrado queda del lado del cliente. |
