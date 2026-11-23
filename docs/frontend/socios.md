# Socios (frontend)

Documentación de la gestión de socios en `apps/web` (Epic 2, FIT-4): pantallas, permisos, cómo se habla con la API y cómo se prueba. La API está documentada en `docs/backend/socios.md`.

La base de la aplicación (cliente de axios, sesión, guards, formularios con `Controller` + `Field`) está en `docs/frontend/frontend-auth.md`; los tests en general, en `docs/frontend/testing-frontend.md`.

---

## 1. Resumen

| Ruta | Pantalla | Quién la ve |
|---|---|---|
| `/socios` | Listado con buscador y filtro por estado; alta, edición y baja | Cualquier usuario con sesión |
| `/socios/:id` | Detalle del socio: datos personales, membresías y pagos | Cualquier usuario con sesión |
| `/` | El inicio muestra la cantidad de socios activos | Cualquier usuario con sesión |

Se llega desde el ítem **Socios** del menú lateral y desde el acceso rápido "Ver socios" del inicio.

Permisos en la interfaz, iguales a los de la API:

- **Recepción y administradores** dan de alta y editan socios.
- **Solo los administradores** ven el botón de dar de baja / reactivar. La API igual lo rechaza con `403` si alguien lo intenta.

| Ticket | Qué agregó |
|---|---|
| FIT-49 | Listado con búsqueda y filtro por estado |
| FIT-50 | Alta y edición en diálogos |
| FIT-51 | Detalle del socio con sus membresías (vigencia) y el historial de pagos |
| FIT-72 (parcial) | Métrica "Socios activos" en el inicio |

---

## 2. Listado (`SociosPage`)

- **Buscador:** filtra por nombre, apellido o DNI. Se consulta a la API recién cuando la persona deja de escribir durante 300 ms (`useValorConRetraso`), no con cada letra.
- **Filtro de estado:** Activos (por defecto), Inactivos o Todos. Se traduce al parámetro `activo` de la API (`true`, `false` o sin parámetro).
- La búsqueda y el filtro se resuelven **en la API**, no filtrando en el navegador.
- Cada combinación de filtros tiene su propia entrada en la caché (`["socios", { q, activo }]`). `keepPreviousData` mantiene la lista anterior en pantalla mientras llega la nueva, así la tabla no parpadea al escribir.
- La tabla muestra apellido y nombre (en ese orden, como lo ordena la API), DNI, contacto (email y teléfono), fecha de ingreso y estado. El nombre es un enlace al detalle.
- Sin resultados, la tabla muestra "No hay socios que coincidan con la búsqueda."

## 3. Alta y edición (`SocioDialogs`)

- El mismo formulario (`CamposSocio`) sirve para crear y para editar, validado con `socioSchema` (Zod). Las reglas copian las de la API: nombre y apellido obligatorios, DNI de 7 u 8 dígitos sin puntos, email válido si se completa y fecha de nacimiento no futura.
- Si la API responde `409` (DNI repetido en el gimnasio), el mensaje se muestra **en el campo DNI** y el diálogo sigue abierto.
- Los campos opcionales vacíos se mandan distinto según la operación:

| Operación | Función | Opcional vacío | Por qué |
|---|---|---|---|
| Alta | `aSocioInput` | Se omite | La API rechaza `""` en email y fecha |
| Edición | `aSocioCambios` | Se manda `null` | En el `PATCH`, omitir un campo lo deja como estaba; `null` lo borra |

Sin esa diferencia, vaciar el email de un socio al editarlo no tenía ningún efecto.

## 4. Detalle (`SocioDetallePage`)

- Muestra los datos personales, el estado y un botón para editar (abre el mismo diálogo de edición).
- La **fecha de nacimiento** se guarda como medianoche UTC y se muestra con `timeZone: "UTC"`: si no, en Argentina (UTC-3) aparecería el día anterior.
- Un socio inexistente o de otro gimnasio muestra "No encontramos a ese socio." (la API responde `404` en los dos casos).
- **Membresías**: `useMembresiasSocio(id)` llama a `GET /api/membresias?socioId=…`. Cada una muestra actividad, tipo, fecha de fin (en UTC) y un badge con la vigencia que calcula la API (`Al día`, `Por vencer`, `Vencida` o `Cancelada`).
- **Historial de pagos**: `usePagosSocio(id)` llama a `GET /api/pagos?socioId=…`, del más reciente al más antiguo. Muestra concepto (o actividad y tipo de la membresía), fecha, método, monto y estado. Usa la misma clave de TanStack Query que la pantalla de pagos (`["pagos", filtros]`), así que invalidar `["pagos"]` refresca las dos; no usa `keepPreviousData` para que al cambiar de socio no se vean los pagos del anterior.
- Los formatos de pagos (montos en centavos, etiquetas, concepto) y `EstadoPagoBadge` están en `features/pagos/formato.ts` y `features/pagos/components/`, compartidos con `PagosPage`.

## 5. Métricas del inicio

- `DashboardPage` usa `useResumen()` (`features/dashboard/hooks/useResumen.ts`), que llama a `GET /api/dashboard/resumen`, y muestra tres tarjetas: **Socios activos**, **Ingresos del mes** (con `formatearMonto` de `features/pagos/formato.ts`) y **Vencimientos próximos**.
- Mientras carga o si falla, cada tarjeta muestra un guion y un texto que explica el motivo; con datos, el número.
- Debajo, **"Vencen en los próximos 7 días"** lista esas membresías con `useVencimientosProximos()` (`GET /api/membresias?vigencia=POR_VENCER`), con enlace al detalle de cada socio. Su clave cuelga de `["dashboard"]`, así que se refresca junto con las métricas.
- Las mutaciones de socios (`useCrearSocio`, `useActualizarSocio`) invalidan también la clave `["dashboard"]`: al dar de alta o de baja un socio y volver al inicio, el número ya está actualizado.

---

## 6. Mapa de archivos

```text
apps/web/src/
├── api/
│   ├── socios.api.ts               # listarSocios, obtenerSocio, crearSocio, actualizarSocio
│   └── dashboard.api.ts            # obtenerResumen
├── features/socios/
│   ├── components/
│   │   ├── SociosTable.tsx         # tabla; los botones de baja solo para ADMIN
│   │   └── SocioDialogs.tsx        # CrearSocioDialog, EditarSocioDialog
│   ├── hooks/useSocios.ts          # useSocios, useSocio, useCrearSocio, useActualizarSocio
│   ├── pages/
│   │   ├── SociosPage.tsx          # listado, buscador y filtro
│   │   └── SocioDetallePage.tsx    # detalle
│   ├── schemas.ts                  # socioSchema, aSocioInput, aSocioCambios
│   └── types.ts                    # Socio, FiltroEstado
├── features/dashboard/
│   ├── hooks/useResumen.ts         # useResumen y DASHBOARD_KEY
│   ├── hooks/useVencimientosProximos.ts
│   └── types.ts                    # ResumenDashboard
└── pages/DashboardPage.tsx         # métricas y vencimientos próximos
```

Las rutas están en `routes/index.tsx` (dentro de `RequireAuth`, sin `RequireRole`) y el ítem del menú en `layouts/AppLayout.tsx`.

---

## 7. Tests

La API falsa (`tests/mocks/fake-api.ts`) imita los endpoints de socios y el resumen del inicio: permisos (baja solo `ADMIN`), `404` entre gimnasios, `409` por DNI repetido, filtros `q` y `activo`, y `null` para borrar opcionales. **Si cambia la API de socios, hay que actualizarla.**

Helpers en `tests/helpers/api.ts`: `apiCrearSocio`, `apiListarSocios` (activos e inactivos) y `apiDarDeBajaSocio`.

| Archivo | Qué prueba |
|---|---|
| `tests/integration/socios.test.tsx` | Listado y orden, aislamiento, búsqueda y filtro, alta, validaciones del cliente, DNI repetido, edición que borra un opcional, baja y reactivación, permisos de la recepción, detalle (incluida la fecha en UTC), socio de otro gimnasio y enlace del menú |
| `tests/integration/dashboard.test.tsx` | Conteo de socios activos del propio gimnasio, `0` sin socios, actualización al dar de alta, ingresos del mes (solo pagos cobrados) y vencimientos próximos con la lista y el enlace al socio |

Como en el resto de los tests de pantalla, se espera **el dato de la tabla** (`findByRole("row", ...)`) y no un texto suelto: "Ana Admin" o el nombre del gimnasio también aparecen en la barra lateral, y un test que no espera la lista puede terminar antes de que llegue.
