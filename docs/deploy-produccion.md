# Deploy en producción: Railway y Netlify

Producción usa dos servicios (FIT-79):

| Parte | Dónde | Cómo se construye |
|---|---|---|
| API + Postgres | **Railway** | Con la imagen Docker de `apps/api/Dockerfile` (ver `docs/backend/deploy.md`), configurada en `railway.json` |
| Web | **Netlify** | `npm run build -w apps/web`, configurado en `netlify.toml` |

Los dos despliegan solos desde la rama **`main`**: a `main` solo se llega por PR desde `dev`, con el CI en verde. Así, lo que está en producción siempre pasó lint, tests, e2e y el build de la imagen.

**Por qué Railway y Netlify.** Railway corre la imagen Docker tal cual (con las migraciones al arrancar y el job de recordatorios, que necesita un proceso siempre prendido) y tiene Postgres en el mismo proyecto, en una red privada. El front es estático: Netlify lo sirve desde un CDN, con HTTPS y un deploy de vista previa por cada PR, sin costo.

---

## 1. API y base en Railway

### Crear el proyecto (una sola vez)

1. En Railway: **New Project → Deploy from GitHub repo** y elegir el repositorio. Si pide permisos, darle acceso a la GitHub App de Railway solo para este repo.
2. En el servicio creado, **Settings**:
   - **Source → Branch:** `main`.
   - **Root Directory:** vacío (la raíz). La imagen se construye desde la raíz porque el monorepo tiene un único `package-lock.json`.
   - **Wait for CI:** activado. Railway espera a que pase el CI de GitHub antes de desplegar.
   - Railway lee `railway.json` de la raíz: builder Dockerfile (`apps/api/Dockerfile`), health check en `/health` y reinicio automático si el proceso se cae. Los cambios que solo tocan `apps/web` o `docs/` no redespliegan la API (`watchPatterns`).
3. **+ New → Database → PostgreSQL**, en el mismo proyecto.
4. En el servicio de la API, **Variables** (ver la tabla de abajo). `DATABASE_URL` se carga como referencia, `${{Postgres.DATABASE_URL}}`, así usa la red privada y se actualiza sola si cambia la contraseña.
5. **Settings → Networking → Generate Domain.** Railway da una URL como `https://fitmanager-api-production.up.railway.app`. Es el `VITE_API_URL` de Netlify.

### Variables de la API

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Un secreto largo y aleatorio, distinto del de desarrollo: `openssl rand -base64 48` |
| `RESEND_API_KEY` | La API key de Resend |
| `MAIL_FROM` | `FitManager <onboarding@resend.dev>` mientras no haya dominio verificado en Resend (con ese remitente los mails solo llegan a la cuenta de Resend; ver `docs/backend/notificaciones.md`) |
| `FRONTEND_URL` | La URL de Netlify, **sin barra final**: `https://<sitio>.netlify.app`. Arma el link de recuperación de contraseña y es el origen que permite CORS |
| `TRUST_PROXY` | `1` (el proxy de Railway). Sin esto, el límite de intentos de login cuenta a todos como si fueran la misma IP |
| `REGISTRO_GIMNASIOS_HABILITADO` | `true` solo hasta dar de alta los gimnasios; después `false` (ver sección 3) |

`NODE_ENV=production` ya viene en la imagen y `PORT` lo pone Railway (la API lo lee).

### Qué pasa en cada deploy

1. Railway construye la imagen con el `Dockerfile`.
2. Al arrancar, el contenedor corre `prisma migrate deploy` y después la API. Si una migración falla, el contenedor no arranca y Railway mantiene la versión anterior.
3. Railway espera a que `GET /health` responda 200 (hasta 120 segundos, contando las migraciones) antes de pasarle tráfico. Después apaga la versión anterior con `SIGTERM`, y la API cierra ordenadamente.

Las migraciones usan la collation `es-x-icu`. El Postgres de Railway trae ICU; si no la tuviera, la primera migración fallaría y se vería en los logs del deploy.

Una sola réplica (`numReplicas: 1`): con más, cada una programaría el job de recordatorios y todas migrarían al arrancar (ver `docs/backend/deploy.md`, sección 5).

### Verificar

```bash
curl https://<api>.up.railway.app/health
# {"status":"ok","timestamp":"..."}
```

Los logs están en el servicio, pestaña **Deployments → View logs** (en JSON, por pino).
