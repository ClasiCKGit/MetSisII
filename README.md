# MetSisII

## FitManager (nombre a definir)

Aplicacion web de gestion de gimnasios. La idea es brindar a el/los administradores y a los socios una plataforma para interactuar con el gimnasio. 

¿Qué podría hacer el sistema?

Como administrador:

- Registrar socios.
- Modificar/eliminar socios.
- Ver listado de socios.
- Registrar profesores.
- Crear actividades (Musculación, Spinning, CrossFit, etc.).
- Asignar profesores.
- Crear horarios.
- Registrar pagos.
- Consultar socios con cuotas vencidas.

Como socio:

- Iniciar sesión.
- Ver sus datos.
- Ver actividades disponibles.
- Inscribirse a una actividad.
- Ver sus próximas clases.
- Consultar el estado de su cuota.

## Integrantes 

- Lautaro Capdeville 
- Santino Crivera 
- Ramiro Pizzico 
- Guido Strizzi

## Tecnologías elegidas.

### Backend
- Backend: TS, express
- Validations: Zod
- Auth: JWT + bcrypt

### DB
- DB: postgres
- ORM: Prisma o sequelize (a definir)

### Frontend
- Frontend: React + vite
- Styles: Tailwind + shadcn/ui

### Extra
- Docker (a definir)
- Testing: Vitest

## Estructura del proyecto

```
FitManager/
├── apps/
│   ├── backend/                      # Backend (Express + TS)
│   │   ├── src/
│   │   │   ├── config/               # env, db connection, constantes
│   │   │   │   ├── env.ts
│   │   │   │   └── database.ts
│   │   │   ├── modules/              # organizado por dominio, no por tipo de archivo
│   │   │   │   ├── socios/
│   │   │   │   │   ├── socios.controller.ts
│   │   │   │   │   ├── socios.service.ts
│   │   │   │   │   ├── socios.routes.ts
│   │   │   │   │   ├── socios.schema.ts      # Zod schemas
│   │   │   │   │   └── socios.types.ts
│   │   │   │   ├── profesores/
│   │   │   │   ├── actividades/
│   │   │   │   ├── pagos/
│   │   │   │   ├── membresias/
│   │   │   │   └── auth/
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── error.middleware.ts
│   │   │   │   └── validate.middleware.ts
│   │   │   ├── utils/
│   │   │   ├── jobs/                 # cron jobs (recordatorios de vencimiento, etc.)
│   │   │   ├── app.ts                # setup de Express (middlewares, rutas)
│   │   │   └── server.ts             # entry point (listen)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── tests/
│   │   ├── .env
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── Frontend/                     # Frontend (React + Vite)
│       ├── src/
│       │   ├── api/                  # funciones que llaman a la API (axios/fetch)
│       │   │   ├── socios.api.ts
│       │   │   ├── pagos.api.ts
│       │   │   └── client.ts         # instancia base de axios
│       │   ├── components/
│       │   │   ├── ui/               # componentes shadcn/ui
│       │   │   └── shared/           # componentes reutilizables propios
│       │   ├── features/             # organizado por dominio, como el back
│       │   │   ├── socios/
│       │   │   │   ├── components/
│       │   │   │   ├── hooks/        
│       │   │   │   └── pages/
│       │   │   ├── profesores/
│       │   │   ├── actividades/
│       │   │   ├── pagos/
│       │   │   └── auth/
│       │   ├── layouts/
│       │   ├── routes/               # definición de rutas (react-router)
│       │   ├── lib/                  # utils, formateo de fechas, etc.
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       ├── index.html
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # tipos y schemas compartidos (Zod, DTOs)
│       ├── src/
│       │   ├── types/
│       │   └── schemas/
│       └── package.json
│
├── docker-compose.yml                # Postgres + API para desarrollo
├── package.json                      # workspaces root
└── README.md
```


## Gestión de dependencias (npm workspaces)

Este proyecto es un **monorepo** manejado con [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces). Contiene tres paquetes:

| Paquete             | Ubicación          | Descripción                          |
|---------------------|---------------------|---------------------------------------|
| `@fitmanager/api`       | `apps/api`          | Backend (Express + TypeScript)        |
| `@fitmanager/web`       | `apps/web`          | Frontend (React + Vite)               |
| `@fitmanager/shared`    | `packages/shared`   | Tipos y schemas (Zod) compartidos     |

### Reglas del equipo

1. **Nunca ejecutes `npm install` dentro de `apps/api`, `apps/web` o `packages/shared`.** Todo se instala desde la raíz del repo.
2. **Hay un solo `package-lock.json`**, en la raíz. No debe existir ningún otro `package-lock.json` en subcarpetas — si aparece uno, borralo.
3. **Si tu código importa algo, esa dependencia tiene que estar declarada en el `package.json` del workspace que la usa**, aunque "funcione" sin declararla (ver sección de *phantom dependencies* más abajo).

### Setup inicial

```bash
git clone https://github.com/ClasiCKGit/MetSisII
cd MetSisII
npm install
```

Esto instala las dependencias de los tres paquetes de una sola vez.

### Comandos comunes

```bash
# Levantar API y Web en simultáneo
npm run dev

# Levantar solo uno
npm run dev:api
npm run dev:web

# Instalar una dependencia en un workspace específico
npm install <paquete> --workspace=apps/api
npm install <paquete> --workspace=apps/web
npm install -D <paquete> --workspace=packages/shared

# Instalar una herramienta compartida para TODO el repo (linters, formatters, etc.)
npm install -D <paquete> -w .

# Build de todos los paquetes
npm run build

# Migraciones de base de datos (Prisma vive en apps/api)
npm run db:migrate
npm run db:studio

# Ver qué workspaces detecta npm (útil para debug)
npm ls --workspaces
```

### ⚠️ Phantom dependencies

Como npm "hoistea" (sube) las dependencias comunes a un único `node_modules` en la raíz, es posible importar un paquete en `apps/api` que en realidad solo fue declarado en `apps/web`, y que igual funcione en tu máquina. **Esto es un bug latente**: se puede romper al buildear en Docker o si otro dev borra esa dependencia del otro workspace.

Antes de abrir un PR, si agregaste un import nuevo, verificá que el paquete esté en el `package.json` correcto. Podés chequear dependencias no declaradas con:

```bash
npx depcheck apps/api
npx depcheck apps/web
```

### Compartir código entre API y Web

Todo lo que necesite vivir tanto en el backend como en el frontend (tipos de dominio, schemas de validación Zod) va en `packages/shared`. Se importa como un paquete normal:

```ts
import { CrearSocioSchema } from "@fitmanager/shared";
```

Si agregás algo nuevo ahí, exportalo desde `packages/shared/src/index.ts`.

## Estado actual y pendientes conocidos.

W.I.P