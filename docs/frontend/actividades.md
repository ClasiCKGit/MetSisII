# Actividades, profesores, horarios y planes (frontend)

Documentación de las pantallas de actividades en `apps/web`: el listado, el detalle de cada actividad y lo que se gestiona desde ahí (profesores, horarios y planes con sus precios). La API está documentada en `docs/backend/profesores-actividades-horarios.md` y, para los planes, en `docs/backend/membresias.md`.

La base de la aplicación (cliente de axios, sesión, guards, formularios con `Controller` + `Field`) está en `docs/frontend/frontend-auth.md`; los tests en general, en `docs/frontend/testing-frontend.md`.

---

## 1. Resumen

| Ruta | Pantalla | Quién la ve |
|---|---|---|
| `/profesores` | Listado de profesores; alta, edición, baja y reactivación | Cualquier usuario con sesión (editar, solo `ADMIN`) |
| `/actividades` | Listado de actividades; alta, edición, baja y reactivación | Cualquier usuario con sesión (editar, solo `ADMIN`) |
| `/actividades/:id` | Detalle: datos de la actividad, **profesores** que la dan, **horarios** y **planes y precios** | Cualquier usuario con sesión (editar, solo `ADMIN`) |

Permisos en la interfaz, iguales a los de la API: la recepción **ve** todo, pero los botones para crear, editar, asignar, quitar y borrar solo aparecen para los administradores. La API igual rechaza con `403` lo que intente alguien sin permiso.

| Ticket | Qué agregó |
|---|---|
| FIT-60 | Gestión de profesores |
| FIT-61 | Gestión de actividades y asignación de profesores |
| FIT-94 | Horarios de cada actividad, en su detalle |
| FIT-96 | Planes y precios (tipos de membresía) de cada actividad, en su detalle |

---

## 2. Detalle de una actividad (`ActividadDetallePage`)

Muestra el nombre, el estado (activa o dada de baja), la descripción y el cupo, y debajo tres secciones independientes. Cada una tiene su propia consulta, su estado de carga y su botón "Reintentar" si falla.

### Profesores (`ProfesoresDeLaActividad`)

- Lista las asignaciones de la actividad (`GET /api/actividades/:id/profesores`), con nombre y especialidad.
- **Asignar:** un selector con los profesores activos que todavía no la dan.
- **Quitar:** pide confirmación y avisa que los horarios que el profesor tenía quedan sin profesor (lo hace la base, con `onDelete: SetNull`). Por eso, al quitar, se invalida **toda la actividad** en la caché (`["actividades", id]`), no solo sus profesores: así la sección de horarios se actualiza sola.
- Con la actividad dada de baja no se ofrece asignar.

### Horarios (`HorariosDeLaActividad`, FIT-94)

Los turnos semanales de la actividad (`GET /api/horarios?actividadId=`), ordenados por día (de lunes a domingo) y hora de inicio, como los devuelve la API. Cada fila muestra el día, el rango de horas y el profesor, o "Sin profesor asignado".

- **Agregar horario** (botón de la sección) y **Editar** (en cada fila) usan el mismo formulario en un diálogo:

  | Campo | Regla en el cliente (`horarioSchema`, `features/actividades/schemas.ts`) |
  |---|---|
  | Día | Obligatorio. Se elige de una lista; a la API se manda sin tildes (`MIERCOLES`, `SABADO`). |
  | Desde / Hasta | Formato `HH:MM` de 24 horas con cero a la izquierda (`08:30`, no `8:30`), y "Hasta" posterior a "Desde". |
  | Profesor | Opcional. Solo se ofrecen los profesores **asignados a esta actividad**, o "Sin profesor asignado". |

  Las reglas son las mismas que valida la API, así que un error de formato se muestra sin hacer el request. El orden de las horas se compara como texto, igual que en el backend: con `HH:MM` y ceros a la izquierda, el orden del texto coincide con el de la hora.

- **El profesor se manda como id de la asignación** (`actividadProfesorId`), no como id del profesor. El horario devuelve ese mismo id, y la pantalla lo traduce a un nombre con la lista de profesores de la actividad, que ya tiene en caché. Mientras esa lista no llegó, la línea del profesor queda vacía en lugar de mostrar un texto provisorio.
- **Borrar** pide confirmación. El borrado es físico (no hay baja lógica de horarios).
- Con la actividad dada de baja no se ofrece agregar horarios (la API respondería `409`). Los existentes se pueden seguir editando o borrando.
- El formulario se monta recién al abrir el diálogo: así, cada vez que se abre arranca con los valores del horario elegido, sin tener que resetearlo a mano.

Caché: `["actividades", id, "horarios"]`. Crear, editar y borrar la invalidan.

### Planes y precios (`TiposDeLaActividad`, FIT-96)

Los **tipos de membresía** de la actividad (`GET /api/tipos-membresia?actividadId=`): lo que se elige al inscribir a un socio. Cada fila muestra el nombre, el precio, la duración y la cantidad de clases ("clases ilimitadas" si no tiene límite). Los dados de baja siguen en la lista, marcados como "Inactivo", para poder reactivarlos.

- **Agregar plan** y **Editar** usan el mismo formulario:

  | Campo | Regla en el cliente (`tipoMembresiaSchema`) |
  |---|---|
  | Nombre | Obligatorio, hasta 100 caracteres. |
  | Precio | En pesos, con **coma o punto** decimal (`12500`, `12500,50`). Hasta 8 enteros y 2 decimales, como la columna `Decimal(10, 2)`. Se manda a la API como número. |
  | Duración (días) | Entero mayor a 0. Define la fecha de fin de cada membresía. |
  | Cantidad de clases | Opcional: vacío significa clases ilimitadas dentro del período (`null` en la API). |

  Al editar, el precio se muestra con coma decimal. Cambiar el precio **no toca las membresías ni los pagos ya registrados**: la inscripción copia el monto al pago en el momento de inscribir, y el diálogo lo aclara.

- **Dar de baja** es una baja lógica (`DELETE` deja `activo: false`): el tipo lo siguen referenciando las membresías que ya lo usan, así que no se borra. Un plan dado de baja **deja de ofrecerse al inscribir** (el diálogo de inscripción solo muestra tipos activos). **Reactivar** hace `PATCH` con `activo: true`.
- Con la actividad dada de baja no se ofrece agregar planes.
- Caché: `["tipos-membresia", { actividadId }]`, debajo de `["tipos-membresia"]`, la clave que usa el diálogo de inscripción. Las mutaciones invalidan el prefijo `["tipos-membresia"]`, así que un plan nuevo o dado de baja se refleja enseguida al inscribir.

---

## 3. Archivos

```
apps/web/src/
├── api/
│   ├── actividades.api.ts              Actividades y sus profesores
│   ├── horarios.api.ts                 Listar (por actividad), crear, actualizar y borrar horarios
│   └── tipos-membresia.api.ts          Listar (todos o por actividad), crear, actualizar y dar de baja planes
└── features/actividades/
    ├── components/
    │   ├── ActividadDialogs.tsx        Alta y edición de actividades
    │   ├── ActividadesTable.tsx
    │   ├── HorariosDeLaActividad.tsx   Sección de horarios con sus diálogos
    │   ├── ProfesoresDeLaActividad.tsx Sección de profesores
    │   └── TiposDeLaActividad.tsx      Sección de planes y precios con sus diálogos
    ├── hooks/
    │   ├── useActividades.ts
    │   ├── useHorarios.ts              Consultas y mutaciones de horarios
    │   ├── useProfesoresDeActividad.ts Actividad y sus profesores
    │   └── useTiposDeActividad.ts      Consultas y mutaciones de planes
    ├── pages/                          ActividadesPage, ActividadDetallePage
    ├── schemas.ts                      actividadSchema, horarioSchema y tipoMembresiaSchema
    └── types.ts                        Actividad, VinculoProfesor, Horario, DIAS_SEMANA
```

---

## 4. Tests

| Archivo | Cubre |
|---|---|
| `actividades.test.tsx` | Listado, alta, edición, baja y permisos |
| `actividad-detalle.test.tsx` | Datos de la actividad, asignar y quitar profesores, permisos |
| `tipos-membresia.test.tsx` | Precio, duración y clases en la lista, alta con coma decimal y cantidad de clases, validaciones sin llamar a la API, edición del precio, baja y reactivación, actividad dada de baja y permisos de la recepción |
| `horarios.test.tsx` | Orden por día y hora, alta con profesor, validaciones del formulario sin llamar a la API, edición (incluido quitar el profesor), borrado, que al quitar un profesor sus horarios queden sin profesor, actividad dada de baja y permisos de la recepción |

La API falsa (`tests/mocks/fake-api.ts`) imita `/horarios` y `/tipos-membresia` con las mismas reglas y mensajes de los services reales (incluido el `SetNull` al quitar una asignación y la baja lógica de los tipos). `tests/helpers/api.ts` tiene `apiCrearHorario`, `apiListarHorarios`, `apiListarTiposMembresia` y `apiDarDeBajaTipoMembresia` para preparar y verificar datos. Los tests de horarios y de planes pasan también con `TEST_API=real`.

---

## 5. Pendientes

| Tema | Detalle |
|---|---|
| Superposición de horarios | La API no valida que dos horarios de la misma actividad no se pisen, y la pantalla tampoco. |
| Vista semanal | Los horarios se ven por actividad. No hay una grilla con todos los turnos del gimnasio. |
