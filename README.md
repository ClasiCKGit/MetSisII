# FitManager

Aplicación web de gestión de gimnasios, desarrollada para las materias Metodologías de Sistemas II y Trabajo Final Integrador.

Es **multi-tenant**: varios gimnasios usan la misma instalación y cada uno ve solo sus propios datos. Para iniciar sesión, el usuario ingresa el identificador de su gimnasio (slug), su email y su contraseña. El aislamiento entre gimnasios se aplica en el backend en cada consulta a la base (ver [`docs/backend/auth.md`](docs/backend/auth.md)).

## Funcionalidades

Los usuarios del sistema son el personal del gimnasio, con dos roles: **administrador** y **recepcionista**.

| Funcionalidad | Estado |
|---|---|
| Registro de gimnasio con su primer administrador | ✅ |
| Inicio de sesión por gimnasio, cambio de contraseña y recuperación por mail | ✅ |
| Gestión de usuarios del personal (solo administradores) | ✅ |
| Alta, edición, baja y listado de socios | ✅ |
| Alta, edición, baja y listado de profesores | ✅ |
| Actividades (Musculación, Spinning, CrossFit, etc.) y asignación de profesores | ✅ |
| Horarios de cada actividad | ✅ |
| Planes y precios (tipos de membresía) de cada actividad | ✅ |
| Inscripción de socios a actividades, con el registro del cobro | ✅ |
| Renovación y cancelación de membresías | ✅ |
| Registro de pagos, cambio de estado y reporte por período exportable a CSV | ✅ |
| Inicio con métricas (socios activos, ingresos del mes, vencimientos próximos) | ✅ |
| Consulta de socios con cuotas por vencer y vencidas sin renovar | ✅ |
| Aviso por mail a los socios con la membresía por vencer | ✅ |
| Gráficos (ingresos por mes, actividades con más inscriptos) | 🚧 |
| Pago online con Mercado Pago | 🚧 |
| Deploy en producción (la imagen Docker de la API ya está) | 🚧 |

### Fuera de alcance

- **Acceso de los socios** (ver sus datos, inscribirse a actividades o consultar su cuota desde la web). El sistema es para el personal del gimnasio: los socios no tienen usuario ni inicio de sesión. Sumarlo implica otro tipo de cuenta, un rol nuevo con sus permisos y pantallas propias, y quedó fuera del alcance de esta entrega. El socio sí recibe por mail el aviso de que su membresía está por vencer.

## Tecnologías

| Capa | Stack |
|---|---|
| Backend | Node.js, TypeScript, Express 5, Zod 4, JWT + bcrypt, Pino |
| Base de datos | PostgreSQL 16 (Docker), Prisma 7 |
| Frontend | React 19, Vite 8, Tailwind 4, shadcn/ui sobre Base UI, React Router, TanStack Query, Zustand, react-hook-form |
| Testing | Vitest, Supertest (API), Testing Library + MSW (web) |
| Calidad y CI | ESLint, Prettier, Husky + lint-staged, GitHub Actions |

Es un monorepo con npm workspaces: `apps/api` y `apps/web`.

## Requisitos

- Node.js 22.12 o superior
- Docker (para Postgres)

## Puesta en marcha

```bash
git clone https://github.com/ClasiCKGit/MetSisII
cd MetSisII
npm install                            # siempre desde la raíz, nunca dentro de apps/*

cp .env.example .env
cp apps/api/.env.example apps/api/.env # completar JWT_SECRET y RESEND_API_KEY
cp apps/web/.env.example apps/web/.env

npm run db:up                          # levantar Postgres (puerto 5433 por defecto)
npm run db:migrate                     # aplicar migraciones
npm run prisma:generate -w apps/api    # generar el cliente de Prisma
npm run db:seed                        # datos de prueba
npm run dev                            # API en :3000 y web en :5173
```

**El orden importa:** el cliente de Prisma se genera aparte y no se commitea, así que sin ese paso la API no compila.

### Datos de prueba

El seed crea dos gimnasios para probar el aislamiento entre ellos:

| Gimnasio (slug) | Email | Contraseña | Rol |
|---|---|---|---|
| `fitzone-bahia-blanca` | `admin@fitzone.com` | `admin123` | Administrador |
| `powergym-punta-alta` | `admin@powergym.com` | `admin123` | Administrador |
| `powergym-punta-alta` | `admin@fitzone.com` | `recepcion123` | Recepcionista |

El último usuario tiene el mismo email que el admin de FitZone pero en otro gimnasio: el email es único por gimnasio, no global.

## Comandos útiles

Todos se corren desde la raíz.

### Desarrollo

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la API y la web juntas |
| `npm run dev:api` / `npm run dev:web` | Levanta solo una |
| `npm run build` | Compila todo el monorepo |
| `npm run typecheck -w apps/api` | Revisa los tipos del código y los tests de la API |
| `npm run lint` / `npm run lint:fix` | ESLint (revisa / corrige) |
| `npm run format:check` / `npm run format` | Prettier (verifica / aplica) |

### Base de datos

| Comando | Qué hace |
|---|---|
| `npm run db:up` / `npm run db:down` | Inicia / detiene Postgres (los datos persisten) |
| `npm run db:logs` | Logs en vivo del contenedor |
| `npm run db:reset` | Borra todos los datos locales y arranca de cero |
| `npm run db:migrate` | Crea y aplica migraciones pendientes |
| `npm run db:seed` | Carga los datos de prueba |
| `npm run db:studio` | Interfaz visual de la base (localhost:5555) |

## Tests

```bash
npm test                 # todos los tests
npm test -w apps/api     # API: necesita Postgres levantado
npm test -w apps/web     # web: no necesita la API ni Postgres
```

- Los tests de la API corren contra una base aparte con sufijo `_test`, que se crea y migra sola; nunca tocan la base de desarrollo.
- Los tests de la web usan una API falsa en memoria (MSW). Con `TEST_API=real` corren contra la API verdadera.
- Para correr un solo archivo o un solo test: `cd apps/api && npx vitest run tests/integration/auth.test.ts` o `cd apps/web && npx vitest run -t "nombre del test"`.

## Estructura del proyecto

```
MetSisII/
├── apps/
│   ├── api/                    # Backend (Express + Prisma)
│   │   ├── prisma/             # schema, migraciones y seed
│   │   ├── src/
│   │   │   ├── config/         # variables de entorno, Prisma, logger y cliente multi-tenant
│   │   │   ├── middlewares/    # autenticación, roles, validación y manejo de errores
│   │   │   ├── modules/        # un módulo por dominio: routes → controller → service + schema
│   │   │   │                   # (auth, usuarios, socios, profesores, actividades, horarios,
│   │   │   │                   #  tipos-membresia, membresias, pagos, dashboard)
│   │   │   ├── jobs/           # tareas programadas (recordatorio de vencimiento)
│   │   │   ├── utils/          # JWT, contraseñas, fechas, mails
│   │   │   ├── app.ts          # setup de Express y montaje de rutas
│   │   │   └── server.ts       # punto de entrada
│   │   └── tests/              # integration/ (con base) y unit/
│   └── web/                    # Frontend (React + Vite)
│       ├── src/
│       │   ├── api/            # llamadas HTTP por dominio
│       │   ├── components/     # ui/ (shadcn) y shared/ (propios)
│       │   ├── features/       # un módulo por dominio: components, hooks, pages, schemas
│       │   ├── layouts/
│       │   ├── lib/            # cliente axios, errores, utilidades
│       │   ├── routes/         # rutas y guards
│       │   └── store/          # sesión (Zustand)
│       └── tests/              # mocks de MSW, integration/ y unit/
├── docs/                       # documentación técnica
├── docker-compose.yml          # Postgres para desarrollo (y la imagen de la API, con npm run docker:api)
└── package.json                # workspaces y scripts de la raíz
```

## Documentación

| Tema | Documento |
|---|---|
| Monorepo y dependencias | [`docs/config-general.md`](docs/config-general.md) |
| Decisiones de diseño | [`docs/decisiones-diseno.md`](docs/decisiones-diseno.md) |
| Flujo de trabajo, convenciones y CI | [`docs/estandarizacion-y-automatizacion.md`](docs/estandarizacion-y-automatizacion.md) |
| Autenticación y multi-tenancy | [`docs/backend/auth.md`](docs/backend/auth.md) |
| Base de datos | [`docs/backend/database.md`](docs/backend/database.md) |
| Socios (API) | [`docs/backend/socios.md`](docs/backend/socios.md) |
| Profesores, actividades y horarios (API) | [`docs/backend/profesores-actividades-horarios.md`](docs/backend/profesores-actividades-horarios.md) |
| Membresías (API) | [`docs/backend/membresias.md`](docs/backend/membresias.md) |
| Pagos (API) | [`docs/backend/pagos.md`](docs/backend/pagos.md) |
| Notificaciones por mail (API) | [`docs/backend/notificaciones.md`](docs/backend/notificaciones.md) |
| Imagen Docker y deploy de la API | [`docs/backend/deploy.md`](docs/backend/deploy.md) |
| Tests de la API | [`docs/backend/testing-backend.md`](docs/backend/testing-backend.md) |
| Tests de membresías y pagos | [`docs/backend/testing-membresias-pagos.md`](docs/backend/testing-membresias-pagos.md) |
| Sesión, rutas y formularios (web) | [`docs/frontend/frontend-auth.md`](docs/frontend/frontend-auth.md) |
| Socios (web) | [`docs/frontend/socios.md`](docs/frontend/socios.md) |
| Actividades, profesores, horarios y planes (web) | [`docs/frontend/actividades.md`](docs/frontend/actividades.md) |
| Tests de la web | [`docs/frontend/testing-frontend.md`](docs/frontend/testing-frontend.md) |

## Flujo de trabajo

- Las ramas salen de `dev` con el formato `integrante/prefijo/descripcion-corta` (por ejemplo `ramiro/feature/crud-socios`).
- Se integran en `dev` con un merge local (`git merge --no-ff`); a `main` solo se llega por PR desde `dev`.
- Commits con Conventional Commits en español: `feat(socios): agregar filtro por estado`.
- El pre-commit corre ESLint y Prettier sobre los archivos modificados. El CI corre lint, formato, build y tests en cada push a `main` y `dev` y en los PR a `main`.

Detalle completo en [`docs/estandarizacion-y-automatizacion.md`](docs/estandarizacion-y-automatizacion.md).

## Integrantes

- Lautaro Capdeville
- Santino Crivera
- Ramiro Pizzico
- Guido Strizzi
