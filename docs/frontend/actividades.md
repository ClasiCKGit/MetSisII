# Actividades, profesores y horarios (frontend)

Documentación de las pantallas de actividades en `apps/web`: el listado, el detalle de cada actividad y lo que se gestiona desde ahí (profesores y horarios). La API está documentada en `docs/backend/profesores-actividades-horarios.md`.

La base de la aplicación (cliente de axios, sesión, guards, formularios con `Controller` + `Field`) está en `docs/frontend/frontend-auth.md`; los tests en general, en `docs/frontend/testing-frontend.md`.

---

## 1. Resumen

| Ruta | Pantalla | Quién la ve |
|---|---|---|
| `/profesores` | Listado de profesores; alta, edición, baja y reactivación | Cualquier usuario con sesión (editar, solo `ADMIN`) |
| `/actividades` | Listado de actividades; alta, edición, baja y reactivación | Cualquier usuario con sesión (editar, solo `ADMIN`) |
| `/actividades/:id` | Detalle: datos de la actividad, **profesores** que la dan y **horarios** | Cualquier usuario con sesión (editar, solo `ADMIN`) |

Permisos en la interfaz, iguales a los de la API: la recepción **ve** todo, pero los botones para crear, editar, asignar, quitar y borrar solo aparecen para los administradores. La API igual rechaza con `403` lo que intente alguien sin permiso.

| Ticket | Qué agregó |
|---|---|
| FIT-60 | Gestión de profesores |
| FIT-61 | Gestión de actividades y asignación de profesores |
| FIT-94 | Horarios de cada actividad, en su detalle |

---

## 2. Detalle de una actividad (`ActividadDetallePage`)

Muestra el nombre, el estado (activa o dada de baja), la descripción y el cupo, y debajo dos secciones independientes. Cada una tiene su propia consulta, su estado de carga y su botón "Reintentar" si falla.

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

---

## 3. Archivos

```
apps/web/src/
├── api/
│   ├── actividades.api.ts              Actividades y sus profesores
│   └── horarios.api.ts                 Listar (por actividad), crear, actualizar y borrar horarios
└── features/actividades/
    ├── components/
    │   ├── ActividadDialogs.tsx        Alta y edición de actividades
    │   ├── ActividadesTable.tsx
    │   ├── HorariosDeLaActividad.tsx   Sección de horarios con sus diálogos
    │   └── ProfesoresDeLaActividad.tsx Sección de profesores
    ├── hooks/
    │   ├── useActividades.ts
    │   ├── useHorarios.ts              Consultas y mutaciones de horarios
    │   └── useProfesoresDeActividad.ts Actividad y sus profesores
    ├── pages/                          ActividadesPage, ActividadDetallePage
    ├── schemas.ts                      actividadSchema y horarioSchema
    └── types.ts                        Actividad, VinculoProfesor, Horario, DIAS_SEMANA
```

---

## 4. Tests

| Archivo | Cubre |
|---|---|
| `actividades.test.tsx` | Listado, alta, edición, baja y permisos |
| `actividad-detalle.test.tsx` | Datos de la actividad, asignar y quitar profesores, permisos |
| `horarios.test.tsx` | Orden por día y hora, alta con profesor, validaciones del formulario sin llamar a la API, edición (incluido quitar el profesor), borrado, que al quitar un profesor sus horarios queden sin profesor, actividad dada de baja y permisos de la recepción |

La API falsa (`tests/mocks/fake-api.ts`) imita `/horarios` con las mismas reglas y mensajes del service real (incluido el `SetNull` al quitar una asignación), y `tests/helpers/api.ts` tiene `apiCrearHorario` y `apiListarHorarios` para preparar y verificar datos. Los tests de horarios pasan también con `TEST_API=real`.

---

## 5. Pendientes

| Tema | Detalle |
|---|---|
| Superposición de horarios | La API no valida que dos horarios de la misma actividad no se pisen, y la pantalla tampoco. |
| Vista semanal | Los horarios se ven por actividad. No hay una grilla con todos los turnos del gimnasio. |
