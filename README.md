# MetSisII

## FitManager

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

## Setup inicial del proyecto

git clone https://github.com/ClasiCKGit/MetSisII
cd MetSisII
npm install

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run db:up                          # levantar Postgres
npm run db:migrate                     # aplicar migraciones
npm run prisma:generate -w apps/api    # generar el cliente de Prisma
npm run db:seed                        # datos de prueba
npm run dev                            # API + web
```

**El orden importa: el cliente de Prisma se genera aparte y no se commitea, así que sin ese paso la API no compila.**

## Comandos utiles

### Daily development

| Comando | Que hace |
|---|---|
| `npm run dev` | Levanta API y web juntas |
| `npm run dev:api` / `npm run dev:web`	| Levanta solo una |
| `npm run build` | Compila todo el monorepo |
| `npm run lint` / `npm run lint:fix` | ESLint (revisa / corrige) | 
| `npm run format` / `npm run format:check` | Prettier (aplica / solo verifica) |

### Base de datos

| Comando | Que hace |
|---|---|
| `npm run db:up`/`npm run db:down` | Inicia / detiene Postgres (los datos persisten) |
| `npm run db:logs` | Logs en vivo del contenedor |
| `npm run db:reset` | Borra todos los datos locales y arranca de cero |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Carga datos de prueba |
| `npm run db:studio` | Interfaz visual de la base (localhost:5555) |

## Tecnologías elegidas.

### Backend
- Backend: TS, express
- Validations: Zod
- Auth: JWT + bcrypt

### DB
- DB: postgres
- ORM: Prisma

### Frontend
- Frontend: React + vite
- Styles: Tailwind + shadcn/ui

### Extra
- Docker
- Testing: Vitest

## Estructura del proyecto

```
FitManager/
├── apps/
│   ├── api/                      # Backend (Express + TS)
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
│   └── web/                     # Frontend (React + Vite)
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

## Integrantes 

- Lautaro Capdeville 
- Santino Crivera 
- Ramiro Pizzico 
- Guido Strizzi