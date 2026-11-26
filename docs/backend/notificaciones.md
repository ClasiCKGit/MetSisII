# Notificaciones por mail (backend)

La API manda dos tipos de mail: el **link de recuperación de contraseña** (FIT-77, ver `docs/backend/auth.md`) y el **recordatorio de vencimiento de membresía** (FIT-75). Los dos salen por [Resend](https://resend.com) a través de una única función, `enviarMail`.

---

## 1. Envío: `utils/mailer.ts`

```ts
await enviarMail({ to, subject, html });
```

- Usa el SDK de Resend con `RESEND_API_KEY` y manda desde `MAIL_FROM`.
- Si Resend devuelve un error, lo registra en el log y lanza `AppError(502, "No se pudo enviar el mail")`. Quien la llama decide qué hacer con ese error (ver abajo).
- **No reintenta.** Un mail que falla se pierde, salvo en el recordatorio, que se vuelve a intentar al día siguiente.

### Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `RESEND_API_KEY` | Sí | API key de Resend. La API no arranca sin ella. |
| `MAIL_FROM` | Sí | Remitente, con el formato `Nombre <direccion@dominio>`. |
| `FRONTEND_URL` | No (`http://localhost:5173`) | Base del link de recuperación (`<FRONTEND_URL>/reset-password?token=...`). También define el origen permitido por CORS si no se define `CORS_ORIGINS`. |
| `ZONA_HORARIA` | No (`America/Argentina/Buenos_Aires`) | Hora a la que corre el recordatorio y formato de la fecha en el mail. |

**Mientras no haya un dominio propio verificado en Resend**, `MAIL_FROM` tiene que ser `FitManager <onboarding@resend.dev>`. Con ese remitente de prueba **Resend solo entrega a la dirección de la cuenta dueña de la API key**: los mails a cualquier otra dirección se rechazan. Para probar la recuperación en local, usar un usuario cuyo email sea el de esa cuenta. En el deploy hay que verificar el dominio en Resend y cambiar `MAIL_FROM`.

### Contenido de los mails

El HTML se arma con template strings. **Todo texto cargado por usuarios** (nombres de socios, usuarios o actividades) se pasa por `escaparHtml` (`utils/html.ts`) antes de interpolarlo; si no, un nombre como `<a href="...">` se mostraría como un link en el mail. Los valores generados por el sistema (fechas, el link de recuperación) no hace falta escaparlos.

---

## 2. Recordatorio de vencimiento: `jobs/recordatorio-vencimiento.job.ts`

Avisa por mail a los socios cuya membresía está por vencer, **una sola vez por membresía**.

### Cuándo corre

`server.ts` llama a `programarRecordatorioVencimiento()` después de conectarse a la base. Con `node-cron`, el job corre **todos los días a las 8:00 en la `ZONA_HORARIA` configurada** (`0 8 * * *`). `createApp()` no lo programa, así que los tests y los scripts no lo disparan.

### Qué membresías toma

| Condición | Por qué |
|---|---|
| `fechaFin` entre hoy y dentro de 7 días (`rangoPorVencer()`) | Es la misma ventana que el estado `POR_VENCER` de la vigencia (ver `docs/backend/membresias.md`). |
| `estado` distinto de `CANCELADA` | Una membresía cancelada no se renueva. |
| `recordatorioEnviado = false` | No repetir el aviso todos los días de la semana. |
| Socio activo y con email | Sin email no hay a quién mandarlo. |
| Gimnasio activo | Un gimnasio dado de baja no manda mails. |

Por cada membresía manda el mail y, **solo si salió bien**, marca `recordatorioEnviado = true`. Si falla, lo registra en el log y sigue con la siguiente: esa membresía se vuelve a intentar en la próxima corrida, mientras siga dentro de la ventana.

`recordatorioEnviado` es una columna de `Membresia` (migración `20261125205149_agregar_recordatorio_enviado_a_membresia`, `false` por defecto). Una renovación crea una membresía nueva, así que el aviso vuelve a salir para el período siguiente.

### Por qué usa el `prisma` global

Es la excepción a la regla de usar siempre `req.db`: el job no atiende un request ni pertenece a un gimnasio, tiene que recorrer **todos**. El filtro `gimnasio: { activo: true }` reemplaza la verificación que en un request hace `authenticate`. Cualquier job nuevo con el mismo alcance tiene que filtrar a mano igual.

### Limitaciones

| Tema | Detalle |
|---|---|
| Sin recuperación de corridas perdidas | Si la API está apagada a las 8:00, ese día no se manda nada. No se pierde el aviso: al día siguiente la membresía sigue en la ventana (salvo que vencía justo ese día). |
| Varias instancias | Con más de una instancia de la API, cada una programa su cron y el aviso podría salir dos veces. Con una sola instancia no pasa. Si se escala, mover el job a un proceso aparte o usar un lock en la base. |
| Sin reintentos inmediatos | Un fallo de Resend se reintenta recién en la corrida del día siguiente. |

### Correrlo a mano

No hay un endpoint para dispararlo. Para probarlo sin esperar a las 8:00, en `apps/api`:

```bash
npx tsx -e "import { enviarRecordatoriosDeVencimiento } from './src/jobs/recordatorio-vencimiento.job'; enviarRecordatoriosDeVencimiento().then(() => process.exit(0))"
```

El `process.exit` hace falta porque el cliente de Prisma deja el proceso abierto. Usa la base y la API key del `.env` de desarrollo: **manda mails de verdad** (con el remitente de prueba, solo a la dirección de la cuenta de Resend).

---

## 3. Tests

Ningún test manda mails. Los que pasan por `enviarMail` la reemplazan con `vi.mock("../../src/utils/mailer", () => ({ enviarMail: vi.fn() }))` y verifican con qué datos se la llamó. Además, `tests/env.ts` fija `RESEND_API_KEY` y `MAIL_FROM` falsos, para que los tests no dependan del `.env` de cada uno.

| Archivo | Cubre |
|---|---|
| `integration/recordatorio-vencimiento.test.ts` | Qué membresías reciben el aviso y que no se repite; quedan afuera las canceladas, las que vencen fuera de la ventana y los socios sin email |
| `integration/auth.test.ts` | El mail de recuperación: a quién se manda, que un fallo de Resend no cambia la respuesta y que el nombre va escapado |
| `unit/html.test.ts` | `escaparHtml` |
