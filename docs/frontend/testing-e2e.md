# Pruebas de punta a punta (Playwright)

Las pruebas de `apps/web/tests-e2e/` abren la app en un **navegador real** (Chromium) y la usan como una persona: escriben en los campos, hacen clic y verifican lo que se ve. Complementan a los tests de `apps/web/tests/` (Vitest + jsdom, ver `docs/frontend/testing-frontend.md`), que son rápidos y cubren casi todo, pero que no prueban lo que solo existe en un navegador:

- El **build de producción** tal como se despliega, incluida la carga diferida de las pantallas (FIT-100): cada pantalla llega en su propio archivo.
- **CORS real** entre la web y la API, en orígenes distintos.
- CSS, foco y diálogos reales (Base UI), navegación, recargas y `localStorage`.

---

## 1. Correrlas

Requisitos: Postgres levantado (`npm run db:up`) y, la primera vez, el navegador de Playwright:

```bash
cd apps/web && npx playwright install chromium   # una sola vez (~120 MB)
```

Desde la raíz:

```bash
npm run test:e2e
```

Playwright levanta todo solo (`webServer` en `apps/web/playwright.config.ts`) y lo apaga al terminar:

| Servidor | Puerto | Cómo |
|---|---|---|
| API | `3100` | `prisma migrate deploy` sobre la base de tests y `tsx src/server.ts`, con `NODE_ENV=test`, `FRONTEND_URL=http://localhost:4173` y valores falsos de Resend |
| Web | `4173` | `npm run build` con `VITE_API_URL=http://localhost:3100` y `vite preview` (el build de producción) |

Los puertos son distintos de los de desarrollo (3000 y 5173), así se pueden correr con `npm run dev` levantado. Si ya hay algo escuchando en 3100 o 4173, Playwright lo reutiliza en lugar de levantar otro (salvo en CI).

Comandos útiles, desde `apps/web`:

```bash
npx playwright test sesion              # un solo archivo
npx playwright test -g "renueva"        # por nombre del test
npx playwright test --headed            # viendo el navegador
npx playwright test --ui                # modo interactivo
npx playwright show-trace test-results/<carpeta-del-test>/trace.zip   # la traza de un test que falló
```

---

## 2. La base de datos

Usan **la misma base que los tests de la API**: `DATABASE_URL` de `apps/api/.env` con el sufijo `_test` (en CI, `TEST_DATABASE_URL`). La configuración lee el `.env` sin cargarlo en el entorno, y aborta si el nombre de la base no termina en `_test`.

**No vacían la base.** Cada test registra su propio gimnasio con un slug aleatorio (`e2e-...`), así los tests pueden correr en paralelo sin pisarse y no importa qué haya dejado otro. Como los datos son de gimnasios distintos, el aislamiento entre gimnasios de la API hace el resto. Los tests de la API sí vacían esa base cada vez que corren, así que los gimnasios `e2e-...` no se acumulan.

---

## 3. Cómo están escritas

- **Los datos se preparan por la API** (`tests-e2e/helpers.ts`: `crearGimnasio`, `crearActividadConPlan`, `crearSocio`, `inscribir`, `crearRecepcionista`), que es rápido y no depende de otras pantallas. **Lo que se prueba se hace por la interfaz.**
- `iniciarSesion(page, credenciales)` entra por la pantalla de login, como un usuario.
- Los elementos se buscan por rol y nombre accesible (`getByRole`, `getByLabel`), igual que en los tests de Testing Library: si un test no encuentra un botón por su nombre, probablemente una persona con lector de pantalla tampoco.
- Las verificaciones de Playwright (`expect(...).toBeVisible()`) esperan solas hasta 10 segundos: no hace falta `waitFor` ni pausas.

| Archivo | Recorridos |
|---|---|
| `sesion.spec.ts` | Sin sesión lleva al login y después vuelve a la página pedida; credenciales inválidas; la sesión sobrevive a recargar en una pantalla diferida; salir; la recepción no ve ni puede abrir las opciones de administrador |
| `socios-y-membresias.spec.ts` | Alta de un socio, inscripción con cobro y pago pendiente; renovación de una membresía por vencer, que sale de los vencimientos del inicio; los datos de un gimnasio no aparecen en otro |

**Qué conviene sumar acá y qué no.** Un recorrido nuevo va en e2e si depende del navegador o del build (navegación, recargas, un flujo completo entre pantallas). Las reglas de negocio y los casos de error van en los tests de Vitest, que corren en segundos y no necesitan servidores.

---

## 4. Tiempos

- Cada test tiene **60 segundos** y cada verificación espera hasta **10**. En la primera corrida (build recién hecho, API recién levantada y varios tests en paralelo) el recorrido más largo superó los 30 segundos por defecto y falló por tiempo, no por un error.
- La suite completa tarda alrededor de 1 minuto y medio en una notebook, contando el build.
- En CI hay **un reintento** por test (`retries: 1`) y dos workers.

---

## 5. CI

El job **"Pruebas e2e (Playwright)"** de `.github/workflows/ci.yml` levanta un Postgres, crea la base `fitmanager_e2e_test`, instala Chromium (`npx playwright install --with-deps chromium`) y corre `npm run test:e2e` con `TEST_DATABASE_URL`. Si falla, sube el reporte HTML de Playwright como artefacto (`playwright-report`, 7 días), con las trazas de los tests que fallaron.

Los resultados locales (`playwright-report/` y `test-results/`) están en `.gitignore`.
