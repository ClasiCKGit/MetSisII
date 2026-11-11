# Testing (frontend)

Documentación de la suite de tests de `apps/web`: cómo correrla, cómo funciona la API falsa, cómo escribir tests nuevos y qué protege. La del backend está en `docs/backend/testing-backend.md`.

**Versiones de referencia:** Vitest 5.1 · MSW 3.0 · Testing Library (React 16, user-event 14, jest-dom 6) · jsdom 27 · React 19.3 · Node ≥ 22.12

---

## 1. Resumen

- Los tests montan **la aplicación completa** (el mismo árbol que `main.tsx`) en un navegador simulado (jsdom) y la usan como la usaría una persona: escriben en los campos, hacen clic y miran la pantalla.
- Las peticiones HTTP las responde una **API falsa en memoria** (`tests/mocks/fake-api.ts`), conectada con **MSW**. No hace falta servidor ni base de datos.
- La API falsa imita el contrato real del backend (rutas, códigos de estado y mensajes de `auth.md`). Para comprobar que sigue siendo fiel, la misma suite se puede correr contra **la API verdadera** (sección 5).
- Cada test crea **su propio gimnasio** y arranca con todo el estado global limpio.
- Al momento de escribir este documento hay **107 tests en 11 archivos**: 65 unitarios y 42 de integración. Tardan unos 25 segundos.

---

## 2. Correr los tests

```bash
npm test -w apps/web              # solo el frontend (no necesita API ni Postgres)
npm test                          # API y frontend (la API sí necesita Postgres)
npm run test:watch -w apps/web    # modo observador
```

Para correr una parte, ubicate en `apps/web`:

```bash
cd apps/web
npx vitest run tests/unit                                 # solo los unitarios
npx vitest run tests/integration/usuarios.test.tsx        # un archivo
npx vitest run -t "desactiva y reactiva"                  # los tests cuyo nombre contenga ese texto
```

---

## 3. Cómo funciona

### Qué hace MSW

MSW intercepta las peticiones **a nivel de red**. El código que corre en los tests es el real: axios, los interceptores, los guards, TanStack Query y las pantallas. No se reemplaza ninguna función; solo cambia quién responde a la petición HTTP. Por eso un test también detecta errores en el cliente HTTP, no solo en los componentes.

```mermaid
flowchart LR
    T[Test] --> UI[App React completa]
    UI --> AX[axios + interceptores]
    AX -->|petición HTTP| MSW[MSW intercepta]
    MSW --> FAKE[API falsa en memoria]
    FAKE -->|respuesta| AX
    AX --> UI
```

### Arranque y limpieza (`tests/setup.ts`)

| Momento | Qué hace |
|---|---|
| Antes de todo | Inicia el servidor de MSW con `onUnhandledFrame: "error"`: una petición sin handler **hace fallar el test** en lugar de salir a la red en silencio. |
| Después de cada test | Desmonta lo renderizado, restaura el servidor simulado, cierra todos los avisos (`toast`), vacía la caché de TanStack Query, borra `localStorage`, reinicia el store de Zustand, restablece los handlers y **vacía la API falsa**. |
| Al final | Cierra el servidor de MSW. |

Lo que tiene estado global se limpia explícitamente porque, si no, un test podría depender de lo que dejó otro. Los avisos son un caso típico: `toast` es un objeto global, y sin `toast.close()` un aviso viejo aparecería en el test siguiente. `aislamiento.test.tsx` comprueba justamente que nada se filtre (el segundo test depende de que el primero corra antes, y Vitest los ejecuta en orden).

### Configuración (`vitest.config.ts`)

- Reutiliza `vite.config.ts` con `mergeConfig` (alias `@`, React Compiler, Tailwind), así los tests resuelven los imports igual que la app.
- Entorno `jsdom` con la página en `http://localhost:5173`: un **origen distinto** al de la API (`http://localhost:3000`), como en desarrollo.
- Variables de entorno de los tests: `VITE_API_URL` (por defecto `http://localhost:3000`) y `VITE_TEST_API` (`fake` o `real`, ver sección 5).

---

## 4. La API falsa (`tests/mocks/fake-api.ts`)

Guarda gimnasios, usuarios y sesiones en memoria, y se vacía después de cada test. Los tokens son valores opacos: la API falsa no firma JWT.

| Endpoint | Qué imita |
|---|---|
| `POST /auth/login` | Un único `401 Credenciales inválidas` para gimnasio, email o contraseña incorrectos y para usuario o gimnasio desactivado. Normaliza el email y el slug. |
| `POST /auth/register-gimnasio` | `201` con una sesión; `409` si el identificador existe; `400` ante datos inválidos o un identificador reservado. |
| `GET /auth/me` | `401` sin token, con token desconocido o con usuario o gimnasio desactivado. |
| `POST /auth/change-password` | `400` si la actual es incorrecta o si la nueva es igual (no `401`, para no cerrar la sesión); `204` si sale bien. |
| `GET/POST /usuarios` | Solo `ADMIN` (`403` si no). Alta con `409` si el email ya existe en el gimnasio y rol `RECEPCIONISTA` por defecto. Lista solo los del propio gimnasio. |
| `PATCH /usuarios/:id` | `404` para un usuario inexistente **o de otro gimnasio**; `409` si un administrador intenta desactivarse o cambiar su propio rol; `400` ante campos no permitidos o un id que no es UUID. |
| `POST /usuarios/:id/reset-password` | `409` sobre uno mismo, `404` si no existe o es de otro gimnasio, `204` si sale bien. |

**CORS.** jsdom aplica CORS como un navegador, y la app y la API están en orígenes distintos. Por eso todas las respuestas llevan `Access-Control-Allow-Origin: *` (igual que el `cors()` del backend) y hay un manejador de `OPTIONS` para el preflight. Sin ese encabezado, axios falla con `No se pudo conectar con el servidor` aunque MSW sí haya respondido. Las funciones `respuesta()` y `sinContenido()` ya lo agregan: usarlas en los handlers nuevos.

### Mantenerla al día

Si la API cambia (un endpoint nuevo, un mensaje de error distinto, una regla nueva), hay que actualizar `fake-api.ts`. La señal de que se desfasó es que un test pasa con la API falsa y falla en modo real.

---

## 5. Modo real: comprobar que la API falsa es fiel

Con `TEST_API=real` la suite **se salta MSW** y corre contra la API verdadera:

```bash
# Git Bash
TEST_API=real npm test -w apps/web
# PowerShell
$env:TEST_API="real"; npm test -w apps/web
```

Requisitos:

- La API tiene que estar corriendo en `VITE_API_URL`.
- **Levantala contra la base de pruebas, no la de desarrollo.** Cada test registra gimnasios con nombres aleatorios en la base que use la API:

```bash
DATABASE_URL="postgresql://fitmanager:fitmanager123@localhost:5433/fitmanager_dev_test?schema=public" npm run dev:api
```

(Esa base la crea la suite del backend la primera vez que corre.)

Correr este modo cada tanto, y siempre después de tocar `fake-api.ts` o la API, es lo que evita que la API falsa se convierta en una ficción que los tests aprueban pero el sistema real no cumple. Un par de tests funcionan igual en ambos modos gracias a ayudantes (por ejemplo, `simularServidorCaido`).

---

## 6. Estructura y cobertura

```
apps/web/
├── vitest.config.ts
└── tests/
    ├── setup.ts                         Arranque y limpieza
    ├── mocks/
    │   ├── fake-api.ts                  API falsa
    │   └── server.ts                    Servidor de MSW
    ├── helpers/
    │   ├── api.ts                       Preparar escenarios y comprobar resultados por API
    │   ├── render.tsx                   renderApp
    │   ├── servidor.ts                  Simular un servidor caído
    │   ├── dialogo.ts                   Esperar que un diálogo se cierre
    │   └── modo.ts                      ¿API falsa o real?
    ├── unit/                            Lógica pura, sin interfaz
    └── integration/                     La app completa
```

| Archivo | Tests | Qué comprueba |
|---|---|---|
| `unit/slugify.test.ts` | 8 | Acentos, símbolos, guiones, largo máximo |
| `unit/redirect.test.ts` | 9 | Volver a la página pedida; rechazo de URLs absolutas, `//` y `/login` |
| `unit/schemas.test.ts` | 22 | Esquemas de Zod: login, registro (identificador, contraseñas), cambio de contraseña y usuarios |
| `unit/api-error.test.ts` | 8 | `toApiError`, `getErrorMessage` y `hasStatus` |
| `unit/auth.store.test.ts` | 8 | Estado de la sesión derivado, qué se persiste y qué no, `logout` |
| `unit/query-client.test.ts` | 10 | Política de reintentos: los `4xx` no se reintentan |
| `integration/sesion.test.tsx` | 22 | Guards, login, sesión guardada, servidor caído, cierre de sesión, roles e interceptores |
| `integration/registro.test.tsx` | 5 | Autocompletado del identificador, validación, registro correcto y `409` en el campo |
| `integration/cambio-contrasena.test.tsx` | 3 | Contraseña actual incorrecta sin cerrar la sesión, validación y cambio correcto |
| `integration/usuarios.test.tsx` | 10 | Listado, alta, edición, rol propio bloqueado, desactivar y reactivar, restablecer contraseña |
| `integration/aislamiento.test.tsx` | 2 | Que nada se filtre de un test al siguiente |

---

## 7. Helpers

| Función | Dónde | Qué hace |
|---|---|---|
| `renderApp(ruta)` | `render.tsx` | Monta la app completa en esa ruta y devuelve `{ router, user }` (`user` es el simulador de usuario de Testing Library). |
| `nuevoGimnasio()` | `api.ts` | Crea un gimnasio con un administrador (`Ana Admin`, contraseña `admin12345`) y devuelve `slug`, `nombre`, `email`, `password`, `token` y `adminId`. |
| `apiCrearUsuario(token, datos)` | `api.ts` | Crea un usuario por API (contraseña `clave12345` por defecto). |
| `apiActualizarUsuario(token, id, cambios)` | `api.ts` | Modifica un usuario por API y devuelve el código HTTP. |
| `apiLoginStatus(slug, email, password)` | `api.ts` | Devuelve el código HTTP del login: `200` si las credenciales sirven. |
| `apiLoginToken(...)` / `apiMeStatus(token)` | `api.ts` | El token de un login, y el código HTTP de `GET /auth/me`. |
| `conSesion(token)` | `api.ts` | Deja una sesión guardada, como si el usuario ya hubiera iniciado sesión antes de abrir la app. |
| `simularServidorCaido()` | `servidor.ts` | El servidor deja de responder. Devuelve la función que lo "levanta"; si el test no la llama, se restaura solo al terminar. |
| `esperarQueSeCierreElDialogo()` | `dialogo.ts` | Espera a que no quede ningún diálogo abierto. |

Las funciones `api*` llaman a la API **por fuera de la app**: sirven para preparar un escenario y para comprobar el resultado (por ejemplo, que la contraseña nueva funciona de verdad), y se comportan igual con la API falsa y con la real.

---

## 8. Cómo escribir un test nuevo

### Convenciones

- Los de lógica pura van en `tests/unit/<tema>.test.ts`; los de pantallas, en `tests/integration/<tema>.test.tsx`.
- Los nombres **describen el comportamiento** en español: `"un email repetido muestra el error en ese campo y el diálogo sigue abierto"`.
- **Cada test crea sus propios datos** con `nuevoGimnasio()` y no depende de otro test.
- Se busca por **rol y nombre accesible** (`getByRole("button", { name: "Guardar" })`) o por etiqueta (`getByLabelText("Email")`), como lo haría una persona. Eso también comprueba la accesibilidad de la pantalla.
- Se verifica el **resultado real**, no solo que algo aparezca: después de crear un usuario, además de verlo en la tabla, se comprueba por API que esa persona puede ingresar.
- Para esperar algo asíncrono se usan `findBy*` (que reintentan), no `setTimeout`.
- Los textos de la interfaz están en español: si cambia un texto, hay que actualizar los tests que lo buscan.

### Qué probar en una pantalla nueva

| # | Caso |
|---|---|
| 1 | El camino feliz, con el efecto real (no solo lo que se ve) |
| 2 | La validación del cliente: se avisa **sin llamar a la API** |
| 3 | Un error de la API (`409`, `400`, `403`…): se muestra donde corresponde y no rompe nada |
| 4 | El permiso por rol, si lo hay |
| 5 | Que un diálogo se cierre al terminar y se reabra vacío |

### Plantilla (una pantalla de socios, por ejemplo)

```tsx
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { conSesion, nuevoGimnasio } from "../helpers/api";
import { renderApp } from "../helpers/render";

describe("gestión de socios", () => {
  it("crea un socio desde el diálogo y aparece en la tabla", async () => {
    const g = await nuevoGimnasio();
    await conSesion(g.token);
    const { user } = renderApp("/socios");

    await user.click(await screen.findByRole("button", { name: "Nuevo socio" }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByLabelText("Nombre"), "Dani");
    await user.click(within(dialogo).getByRole("button", { name: "Crear socio" }));

    expect(await screen.findByText("Socio creado")).toBeInTheDocument();
    expect(await screen.findByText("Dani")).toBeInTheDocument();
  });
});
```

### Agregar un endpoint a la API falsa

1. Agregar el handler en `crearHandlers` de `fake-api.ts`, con `http.get(`${base}/socios`, ...)`.
2. Responder con `respuesta(status, cuerpo)` o `sinContenido()` (llevan el encabezado de CORS).
3. Replicar **las mismas reglas que el backend**: autenticación (`autenticar` / `autenticarAdmin`), el aislamiento por gimnasio y los códigos de error.
4. Correr la suite en **modo real** para comprobar que la API falsa y la verdadera coinciden.

---

## 9. Técnicas usadas

| Técnica | Dónde | Para qué |
|---|---|---|
| `renderApp` con el árbol de `main.tsx` | Integración | Probar la app como se usa, con rutas, guards, TanStack Query y avisos |
| `conSesion(token)` | Integración | Entrar sin pasar por el login; también simula "cerrar y volver a abrir la pestaña" |
| `within(dialogo)` | Diálogos | Acotar la búsqueda a un diálogo, porque hay campos con el mismo nombre fuera de él |
| `getByRole("table", { hidden: true })` | `usuarios.test.tsx` | Mientras hay un diálogo abierto, el resto de la página queda **inerte** (oculta a los lectores de pantalla); `hidden: true` permite referirse a la tabla y los `findBy*` esperan a que vuelva a ser accesible |
| `findByRole("dialog", { name: "…" })` | Diálogos | Los avisos (`toast`) también tienen `role="dialog"`: filtrar por nombre evita encontrar dos elementos |
| Capturar la petición en el adaptador de axios | `sesion.test.tsx` | Ver la petición **final**, después de todos los interceptores (los de request corren en orden inverso al de registro) |
| `vi.spyOn(apiClient, "post")` | `sesion.test.tsx` | Comprobar que la validación del cliente **no** llama a la API |
| `simularServidorCaido()` | `sesion.test.tsx` | Probar el error de conexión y el botón "Reintentar" |
| `it.each` | Unitarios | La misma regla con muchos datos (identificadores válidos e inválidos, rutas de redirección) |

---

## 10. Cómo sabemos que detectan fallas

Un test que pasa no prueba que sirva: también tiene que fallar cuando el código se rompe. Para validar la suite se rompió el código a propósito de 17 maneras y se comprobó que algún test fallara.

| Rotura introducida | Lo detecta |
|---|---|
| `slugify` deja de quitar acentos | Unitarios y registro |
| Se aceptan rutas de redirección que empiezan con `//` | `redirect.test.ts` |
| Se aceptan identificadores reservados | Unitarios y registro |
| Se acepta una contraseña nueva igual a la actual | `schemas.test.ts` |
| `hasStatus` nunca coincide | Registro y usuarios |
| `persist` guarda también el usuario | Sesión y `auth.store.test.ts` |
| `logout` olvida el último gimnasio | Sesión y `auth.store.test.ts` |
| Con token y sin usuario ya se considera autenticado | Sesión y `auth.store.test.ts` |
| Se reintentan los errores `4xx` | `query-client.test.ts` |
| Un `401` en el login cierra la sesión | `sesion.test.tsx` |
| El cliente deja de enviar el token | `sesion.test.tsx` |
| `RequireRole` deja pasar a cualquier rol | `sesion.test.tsx` |
| `AuthBootstrap` no guarda el perfil | `sesion.test.tsx` |
| Crear un usuario ya no refresca la lista | `usuarios.test.tsx` |
| En la fila propia se muestran "Desactivar" y "Contraseña" | `usuarios.test.tsx` |
| Un `409` del registro ya no se muestra en el campo | `registro.test.tsx` |
| El diálogo de contraseña no se cierra al terminar | `cambio-contrasena.test.tsx` |

**Para validar un test nuevo**, hacé lo mismo a mano: rompé temporalmente el código que debería proteger, corré el test y comprobá que falle. Un test que pasa con el código sano y con el roto no está probando nada.

> **Cuidado:** si se interrumpe una prueba de mutación a mitad de camino, puede quedar una rotura aplicada en el código. Después de hacerla, verificá con `git diff` que no quedó ningún cambio que no hayas querido.

---

## 11. Configuración y compatibilidad

- **`vitest.config.ts`** hace `mergeConfig` con `vite.config.ts`, así que este tiene que exportar un **objeto** (`export default defineConfig({ ... })`), no una función.
- **`import.meta.dirname`, no `__dirname`**, en los archivos de configuración de Vite. Con `__dirname` Vite 8 avisa que dejará de funcionar con el cargador nativo. Por la misma razón, el `import` entre archivos de configuración lleva la extensión (`"./vite.config.ts"`).
- **`tsconfig.app.json`** incluye `tests` (`"include": ["src", "tests"]`), así el editor y `tsc -b` revisan también los tests. **`tsconfig.node.json`** incluye `vitest.config.ts`.
- **ESLint** aplica a los tests las mismas reglas de React que al resto de `apps/web`.
- **MSW 3:** `http` y `HttpResponse` se importan de `msw/http`, y `setupServer` de `msw/node`. La opción que hace fallar las peticiones sin handler se llama **`onUnhandledFrame`**; el nombre anterior (`onUnhandledRequest`) **se ignora en silencio**.
- **Las variables de entorno** de los tests se leen con `import.meta.env` (por ejemplo `import.meta.env.VITE_TEST_API`), no con `process.env`, porque el `tsconfig` de la app no incluye los tipos de Node.
- Vitest 5 y MSW 3 requieren **Node ≥ 22.12**.

---

## 12. Limitaciones

| Tema | Detalle |
|---|---|
| jsdom no es un navegador real | No hay diseño visual, estilos computados reales ni el comportamiento exacto del foco. Un cambio puramente visual no lo detecta ningún test. |
| La API falsa puede desfasarse | Es una copia del contrato. Se controla corriendo el modo real (sección 5). |
| Dependencia de `data-slot` | Los tests que esperan el cierre de un diálogo lo identifican por `[data-slot="dialog-content"]`, que es la convención de shadcn. Si ese atributo desaparece de `dialog.tsx`, hay que actualizar `esperarQueSeCierreElDialogo`. |
| Textos en español | Un cambio de texto en la interfaz obliga a actualizar los tests que lo buscan. |
| Sin cobertura medida | No se mide ni hay un mínimo exigido. Se puede agregar más adelante con `@vitest/coverage-v8`. |
| Sin pruebas en un navegador real | Los flujos completos en un navegador (por ejemplo con Playwright) no están automatizados. |

---

## 13. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `[MSW] Error: intercepted a request without a matching request handler` | La app llamó a una ruta que la API falsa no tiene | Agregar el handler en `fake-api.ts` (sección 8) o corregir la URL |
| La app muestra `No se pudo conectar con el servidor` en un test con MSW | Un handler responde sin el encabezado de CORS | Usar `respuesta()` o `sinContenido()`, que ya lo agregan |
| Un test pasa en modo falso y falla en modo real (o al revés) | La API falsa se desfasó del backend | Comparar con `auth.md` y corregir `fake-api.ts` |
| `Found multiple elements with the role "dialog"` | Hay un aviso en pantalla y también tiene `role="dialog"` | Filtrar por nombre: `findByRole("dialog", { name: "…" })` |
| `Unable to find an accessible element with the role "table"` con un diálogo abierto | El resto de la página queda inerte mientras hay un diálogo | Usar `{ hidden: true }`, o esperar con `findBy*` a que el diálogo se cierre |
| Un aviso de un test anterior aparece en el siguiente | Se saltó la limpieza de `setup.ts` | No quitar `toast.close()` ni el resto de la limpieza |
| Un test que cambió la URL del cliente rompe los siguientes | No se restauró el servidor | Usar `simularServidorCaido()` (se restaura solo) en lugar de tocar `apiClient.defaults` |
| Una petición sin handler no falla, solo avisa | Se usó el nombre viejo de la opción | La opción es `onUnhandledFrame`, no `onUnhandledRequest` |
| `(!) Your Vite config uses features that are unsupported by configLoader: 'native'` | `__dirname` en `vite.config.ts` o un `import` sin extensión | Ver la sección 11 |
| `Cannot find module '@/...'` en un test | Falta `paths` en `tsconfig.app.json` o el alias en `vite.config.ts` | Ver `frontend-auth.md`, sección 11 |
| `process is not defined` en un test | El `tsconfig` de la app no incluye los tipos de Node | Usar `import.meta.env` |
| El test espera para siempre que se cierre un diálogo | El `dialog.tsx` no tiene `data-slot="dialog-content"` | Revisar el archivo (sección 12) |
| La suite no termina y queda esperando | Se ejecutó el modo observador | `npm test` usa `vitest run`; el observador es `test:watch` |

---

## 14. Antes de abrir un Pull Request

```bash
npm run lint
npm run format:check
npm run build -w apps/web      # incluye el chequeo de tipos de los tests
npm test -w apps/web
```

Si agregaste o cambiaste una pantalla, confirmá que tiene los casos de la sección 8. Si tocaste la API o `fake-api.ts`, corré también la suite en **modo real**.
