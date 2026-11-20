# Membresías

Todas las rutas requieren sesión y se limitan al gimnasio del usuario autenticado.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/membresias` | Lista membresías; filtros opcionales: `socioId`, `estado` y `vigencia` |
| `GET` | `/api/membresias/:id` | Obtiene una membresía con socio, actividad y tipo |
| `POST` | `/api/membresias/inscripciones` | Inscribe a un socio y crea el pago en una sola transacción (ADMIN o RECEPCIONISTA) |

## Vigencia

La respuesta agrega `estadoVigencia`, calculado al consultar y al inscribir. No se persiste porque depende de la fecha actual:

- `AL_DIA`: faltan más de 7 días calendario para la fecha de fin.
- `POR_VENCER`: vence hoy o dentro de los próximos 7 días calendario.
- `VENCIDA`: la fecha de fin ya pasó.
- `null`: la membresía está cancelada.

La vigencia usa días calendario UTC y compara la fecha de fin inclusivamente. Se puede filtrar con, por ejemplo, `/api/membresias?socioId=<uuid>&vigencia=POR_VENCER`. El campo `estado` del modelo (`ACTIVA`, `VENCIDA`, `CANCELADA`) se conserva aparte por compatibilidad y para el ciclo operativo.

La inscripción requiere `socioId`, `actividadId`, `tipoMembresiaId` y `metodoPago`. El monto se toma del precio vigente del tipo de membresía; se crean la membresía y el pago pendiente dentro de `req.db.$transaction`. La respuesta agrega un resumen `pago` y serializa `pago.monto` como una cadena decimal con dos dígitos. Si falla cualquiera de las dos escrituras, se revierten ambas.

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

Las pruebas específicas están en `apps/api/tests/integration/membresias.test.ts` y `apps/api/tests/unit/membresia-vigencia.test.ts`.
