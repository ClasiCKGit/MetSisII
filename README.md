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

## Cómo instalar dependencias.

W.I.P.

## Cómo ejecutar el proyecto.

W.I.P.

## Estado actual y pendientes conocidos.

0%