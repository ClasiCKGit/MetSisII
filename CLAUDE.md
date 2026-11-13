# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

FitManager: app web multi-tenant de gestión de gimnasios. Monorepo con npm workspaces: `apps/api` (Express 5 + Prisma 7 + Zod 4 + Postgres), `apps/web` (React 19 + Vite 8 + Tailwind 4 + shadcn/ui sobre Base UI), `packages/shared` (vacío por ahora). Código, mensajes de error, textos de UI, nombres de tests y commits van **en español**.

La documentación detallada está en `docs/` (`backend/auth.md`, `backend/testing-backend.md`, `backend/database.md`, `backend/profesores-actividades-horarios.md`, `frontend/frontend-auth.md`, `frontend/testing-frontend.md`, `estandarizacion-y-automatizacion.md`, `decisiones-diseno.md`). Leer la sección relevante antes de cambios no triviales.

## Comandos

Siempre desde la raíz (`npm install` nunca dentro de `apps/*`; hay un único `package-lock.json`).

```bash
npm run db:up                         # Postgres en Docker (puerto del host: POSTGRES_PORT, 5433 por defecto)
npm run db:migrate                    # prisma migrate dev
npm run prisma:generate -w apps/api   # obligatorio: el cliente (apps/api/src/generated/) no se commitea; sin él la API no compila
npm run db:seed
npm run dev                           # API (:3000) + web (:5173); o dev:api / dev:web

npm run lint                          # ESLint (lint:fix para corregir)
npm run format:check                  # Prettier (format para aplicar)
npm run build                         # build de todos los workspaces
npm run typecheck -w apps/api         # tipos de código y tests de la API

npm test                              # todos los tests (la API necesita Postgres levantado)
npm test -w apps/api | -w apps/web
npm run test:watch -w apps/web
```

Un solo test (Vitest), ubicándose en el workspace:

```bash
cd apps/api && npx vitest run tests/integration/auth.test.ts
cd apps/web && npx vitest run -t "desactiva y reactiva"
```

El CI (`.github/workflows/ci.yml`) corre lint, format:check, prisma:generate, build y tests en cada push a `main` y `dev` y en los PR a `main`. El pre-commit de Husky corre lint-staged (eslint --fix sobre `.ts/.tsx`; Prettier ignora los `.md`).

## Arquitectura del backend (`apps/api`)

- `src/app.ts` exporta `createApp()` (lo usan `server.ts` y los tests con supertest). Cada dominio es un módulo en `src/modules/<dominio>/` con `routes → controller → service`, más `schema.ts` (Zod) y `types.ts`. Las rutas se montan en `app.ts` bajo `/api/<dominio>`.
- Express 5: los handlers async pueden lanzar; `errorHandler` (`middlewares/error.middleware.ts`) traduce `AppError(status, msg)`, `ZodError` (400), Prisma `P2002` (409) y `P2025` (404). Las respuestas de error tienen forma `{ error: string, details? }`.
- Los controllers validan params con Zod (`idParamsSchema.parse(req.params)`); el body se valida con `validateBody(schema)` en la ruta. Los services reciben `req.db` y `req.auth` como argumentos, no el `req`.
- `config/env.ts` valida las variables con Zod al importarse. Variable nueva → agregarla ahí y al `.env.example` correspondiente.

### Multi-tenancy (crítico)

- `authenticate` (`middlewares/auth.middleware.ts`) verifica el JWT, **re-consulta el usuario en cada request** (desactivar usuario/gimnasio o cambiar rol tiene efecto inmediato) y setea `req.auth` y `req.db = tenantClient(gimnasioId)`. `requireRole("ADMIN")` restringe por rol.
- `config/tenant.ts`: `tenantClient` es una Prisma Client Extension que agrega `gimnasioId` con `AND` a cada `where`, lo fuerza en los `create` y lo quita del `data` en los `update`. Falla cerrado: un modelo que no está en `TENANT_RULES` lanza error.
- Reglas:
  1. En código que atiende requests usar **siempre `req.db`**, nunca el `prisma` global (solo para `auth` previo a la sesión, scripts y tests).
  2. Usar ids escalares (`socioId: "..."`), **nunca `connect`** (choca con el `gimnasioId` que agrega la extensión).
  3. Validar con `req.db` los ids que llegan en el body antes de referenciarlos; si es de otro gimnasio da `null` → 404.
  4. `$queryRaw` no pasa por la extensión: evitarlo o filtrar por `gimnasioId` a mano.
  5. Modelo nuevo → registrarlo en `TENANT_RULES` (y si no tiene `gimnasioId`, primero una migración).
  6. `Gimnasio` solo se lee/actualiza el propio; el borrado es lógico (`activo`).
- `req.db.$transaction` mantiene el aislamiento.

### Prisma

Cambio de `schema.prisma` → nueva migración con `npm run db:migrate` y actualizar `prisma/seed.ts`. Nunca editar migraciones ya commiteadas. Prisma 7 busca `prisma.config.ts` en el directorio actual: correr los comandos con los scripts de la raíz o con `-w apps/api`.

### Tests de la API

- Corren contra Postgres real en una base derivada de `DATABASE_URL` con sufijo `_test` (en CI, `TEST_DATABASE_URL`). `tests/global-setup.ts` la crea y aplica `prisma migrate deploy`; `assertTestDatabase` aborta si el nombre no termina en `_test`.
- `beforeEach` hace `TRUNCATE "gimnasios" CASCADE`; los archivos corren en serie (`fileParallelism: false`). `tests/env.ts` debe ir antes que `setup.ts` en `setupFiles`.
- Convenciones: `tests/integration/` si usa la base, `tests/unit/` si no; nombres que describen comportamiento; datos con `tests/helpers/factories.ts` y sesión con `tokenDe(...)` (no el endpoint de login); verificar el efecto en la base, no solo el status.
- Todo endpoint nuevo prueba: 401 sin sesión, 403 por rol, 400 con datos inválidos sin efectos, camino feliz + cambio en la base, y **404 sobre un recurso de otro gimnasio sin modificarlo**.

## Arquitectura del frontend (`apps/web`)

- Organizado por dominio en `src/features/<dominio>/{components,hooks,pages}` + `schemas.ts`/`types.ts`; llamadas HTTP en `src/api/<dominio>.api.ts` sobre el axios de `lib/api-client.ts` (inyecta el token, maneja 401); errores normalizados en `lib/api-error.ts`. Rutas y guards en `src/routes/index.tsx` y `features/auth/components/guards.tsx`.
- Estado: sesión (token, `ultimoSlug`) en Zustand (`store/auth.store.ts`, `persist` con `partialize`); datos del servidor en TanStack Query. Selectores siempre; un selector que devuelve un objeto nuevo rompe el render en Zustand 5 → usar `useShallow`. Fuera de React, `getState()`.
- Formularios: react-hook-form + Zod con `Controller` + `Field`.
- shadcn sobre **Base UI**: usar la prop `render` en lugar de `asChild`, y `toast` en lugar de `sonner`. Agregar componentes desde `apps/web` con `npx shadcn@latest add <nombre>`.
- React Compiler + `eslint-plugin-react-hooks` 7: nada de `setState` sincrónico en `useEffect` (pedir datos con TanStack Query), no leer `ref.current` en render, nada impuro en render; archivos de componentes solo exportan componentes (`react-refresh/only-export-components`).
- Imports con alias `@/`; `verbatimModuleSyntax` y `erasableSyntaxOnly` → `import type` y nada de parameter properties en clases.
- Requiere `apps/web/.env` con `VITE_API_URL=http://localhost:3000`.

### Tests del frontend

- Vitest + jsdom + Testing Library + MSW. Por defecto usan una API falsa en memoria (`tests/mocks/fake-api.ts`), sin API ni Postgres. Si cambia un endpoint o mensaje de la API, **actualizar `fake-api.ts`**; sus respuestas deben incluir CORS (usar los helpers `respuesta()` / `sinContenido()`).
- `TEST_API=real` corre la suite contra la API verdadera (levantarla contra la base `_test`, no la de desarrollo). PowerShell: `$env:TEST_API="real"; npm test -w apps/web`.

## Git

- Las ramas de trabajo salen de `dev` y se integran **en local, sin PR**: `git merge --no-ff <rama>` sobre `dev` actualizada, después `git push` y se borra la rama. A `main` (protegida) solo se llega por PR desde `dev`. Detalle en `docs/estandarizacion-y-automatizacion.md`.
- Nombre de rama: `nombre-integrante/prefijo/descripcion-corta`, en minúsculas, con guiones y sin tildes (prefijos `feature/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`, `ci/`...). Una rama por tarea.
- Conventional Commits en español, infinitivo, minúscula, sin punto final: `feat(auth): agregar login con identificador de gimnasio`. Un commit, un propósito.
