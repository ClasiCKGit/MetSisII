# Membresías

Todas las rutas requieren sesión y se limitan al gimnasio del usuario autenticado.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/membresias` | Lista membresías; filtros opcionales: `socioId`, `estado` y `vigencia` |
| `GET` | `/api/membresias/:id` | Obtiene una membresía con socio, actividad y tipo |
| `POST` | `/api/membresias/inscripciones` | Inscribe a un socio y crea el pago en una sola transacción (ADMIN o RECEPCIONISTA) |
| `POST` | `/api/membresias/:id/renovaciones` | Renueva una membresía: crea la siguiente con su pago, en una sola transacción (ADMIN o RECEPCIONISTA) |

## Tipos de membresía

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/tipos-membresia` | Lista los tipos con su actividad; filtro opcional `actividadId` |
| `GET` | `/api/tipos-membresia/:id` | Obtiene un tipo con su actividad |
| `POST` | `/api/tipos-membresia` | Crea un tipo para una actividad del gimnasio (ADMIN) |
| `PATCH` | `/api/tipos-membresia/:id` | Actualiza los campos enviados (ADMIN) |
| `DELETE` | `/api/tipos-membresia/:id` | Baja lógica (`activo: false`): se conserva por las membresías que lo referencian (ADMIN) |

Desde la web se gestionan en el detalle de cada actividad, sección "Planes y precios" (ver `docs/frontend/actividades.md`).

El `precio` debe ser no negativo, con hasta 2 decimales y como máximo `99999999.99` (la columna es `Decimal(10, 2)`); fuera de eso responde 400. Los ids de la ruta y del filtro deben ser UUID válidos.

## Vigencia

La respuesta agrega `estadoVigencia`, calculado al consultar y al inscribir. No se persiste porque depende de la fecha actual:

- `AL_DIA`: faltan más de 7 días calendario para la fecha de fin.
- `POR_VENCER`: vence hoy o dentro de los próximos 7 días calendario.
- `VENCIDA`: la fecha de fin ya pasó.
- `null`: la membresía está cancelada.

Las membresías que entran en `POR_VENCER` reciben un mail de aviso una sola vez (campo `recordatorioEnviado`, ver `docs/backend/notificaciones.md`).

La vigencia usa días calendario UTC y compara la fecha de fin inclusivamente. Se puede filtrar con, por ejemplo, `/api/membresias?socioId=<uuid>&vigencia=POR_VENCER`. El campo `estado` del modelo (`ACTIVA`, `VENCIDA`, `CANCELADA`) se conserva aparte por compatibilidad y para el ciclo operativo.

La inscripción requiere `socioId`, `actividadId`, `tipoMembresiaId` y `metodoPago`. El monto se toma del precio vigente del tipo de membresía; se crean la membresía y el pago pendiente dentro de `req.db.$transaction`. La respuesta agrega un resumen `pago` y serializa `pago.monto` como una cadena decimal con dos dígitos. Si falla cualquiera de las dos escrituras, se revierten ambas. La transacción es `Serializable` para no superar el cupo: si dos inscripciones chocan, una responde 409 y se puede reintentar.

Ejemplo de alta:

```http
POST /api/membresias/inscripciones
Authorization: Bearer <token>
Content-Type: application/json

{
  "socioId": "<uuid-socio>",
  "actividadId": "<uuid-actividad>",
  "tipoMembresiaId": "<uuid-tipo>",
  "metodoPago": "TRANSFERENCIA"
}
```

La respuesta `201` incluye los datos de la membresía y:

```json
{
  "pago": {
    "id": "<uuid-pago>",
    "monto": "12500.50",
    "metodoPago": "TRANSFERENCIA",
    "estado": "PENDIENTE"
  }
}
```

## Renovación (FIT-95)

`POST /api/membresias/:id/renovaciones` crea la membresía **siguiente** del mismo socio en la misma actividad. Existe porque la inscripción rechaza una segunda membresía activa en la actividad: sin esto, una membresía por vencer no se podía renovar hasta que venciera, y el mail de recordatorio le pide al socio justamente que renueve a tiempo.

```http
POST /api/membresias/<uuid-membresia>/renovaciones
Authorization: Bearer <token>
Content-Type: application/json

{ "metodoPago": "EFECTIVO", "tipoMembresiaId": "<uuid-tipo>" }
```

- `metodoPago` es obligatorio. `tipoMembresiaId` es opcional: **sin él se renueva con el mismo tipo**; con él, tiene que ser un tipo activo de la misma actividad (sirve para pasar, por ejemplo, de mensual a trimestral). Cualquier otro campo da `400`, incluida `fechaInicio`: la fecha no se elige.
- **Fecha de inicio:** la `fechaFin` de la membresía que se renueva, así no quedan días sin cubrir ni superpuestos. Si ya venció, empieza en el momento de renovar. La `fechaFin` nueva se calcula con la duración del tipo, igual que al inscribir.
- Crea un **pago pendiente** por el precio vigente del tipo y responde `201` con la misma forma que la inscripción (la membresía nueva con su `pago`).
- Marca la membresía renovada con `renovada: true` y `recordatorioEnviado: true` (ya no hace falta avisarle al socio que vence).

**Reglas**, con los mismos mensajes que la inscripción donde coinciden:

| Caso | Respuesta |
|---|---|
| La membresía no existe o es de otro gimnasio | `404` "Membresía no encontrada" |
| Está cancelada | `409` "No se puede renovar una membresía cancelada" |
| Ya fue renovada | `409` "La membresía ya fue renovada" |
| Socio dado de baja / actividad inactiva | `404`, como en la inscripción |
| El tipo (el mismo o el elegido) está dado de baja o es de otra actividad | `400` "El tipo de membresía no está activo para esta actividad" |
| El socio ya tiene **otra** membresía activa en la actividad que sigue vigente en la fecha de inicio (por ejemplo, renovar una vencida vieja después de haberse vuelto a inscribir) | `409` "El socio ya tiene una membresía activa para esta actividad" |
| La actividad está llena en la fecha de inicio | `409` "La actividad no tiene cupo disponible" |

**Cupo:** se cuenta como en la inscripción, en la fecha de inicio de la renovación, pero **sin contar la membresía que se renueva** (termina justo cuando empieza la nueva y es del mismo socio: el lugar es el suyo).

**Concurrencia:** todo ocurre en una transacción `Serializable`, como la inscripción. Si dos pedidos renuevan la misma membresía a la vez, uno crea la renovación y el otro responde `409`; nunca quedan dos membresías nuevas ni un pago huérfano (hay un test que lo prueba con dos requests simultáneas).

**Código compartido:** inscripción y renovación usan las mismas funciones internas del service (`validarSocioActividadYTipo`, `verificarDisponibilidad` y `crearMembresiaConPago`), así que una regla nueva de inscripción vale para las dos.

### El campo `renovada`

Columna de `Membresia` (`false` por defecto, migración `20261126165407_agregar_renovada_a_membresia`). Una membresía renovada sigue teniendo su vigencia real (puede figurar como `POR_VENCER` hasta su fecha de fin), pero el socio ya tiene la siguiente, así que:

- **No cuenta** en `vencimientosProximos` de `GET /api/dashboard/resumen`.
- **No recibe** el mail de recordatorio de vencimiento (ver `docs/backend/notificaciones.md`).
- **No se puede renovar** otra vez.
- `GET /api/membresias` la sigue devolviendo, con `renovada: true`; el filtro `vigencia` no la excluye. El inicio de la web la saca de su lista de vencimientos.

Las pruebas específicas están en `apps/api/tests/integration/membresias.test.ts`, `apps/api/tests/integration/renovaciones.test.ts`, `apps/api/tests/integration/tipos-membresia.test.ts` y `apps/api/tests/unit/membresia-vigencia.test.ts`.
