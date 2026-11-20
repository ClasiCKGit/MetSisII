# Membresías

Todas las rutas requieren sesión y se limitan al gimnasio del usuario autenticado.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/membresias` | Lista membresías; filtros opcionales: `socioId`, `estado` y `vigencia` |
| `GET` | `/api/membresias/:id` | Obtiene una membresía con socio, actividad y tipo |
| `POST` | `/api/membresias/inscripciones` | Inscribe a un socio (ADMIN o RECEPCIONISTA) |

## Vigencia

La respuesta agrega `estadoVigencia`, calculado al consultar y al inscribir. No se persiste porque depende de la fecha actual:

- `AL_DIA`: faltan más de 7 días calendario para la fecha de fin.
- `POR_VENCER`: vence hoy o dentro de los próximos 7 días calendario.
- `VENCIDA`: la fecha de fin ya pasó.
- `null`: la membresía está cancelada.

La vigencia usa días calendario UTC y compara la fecha de fin inclusivamente. Se puede filtrar con, por ejemplo, `/api/membresias?socioId=<uuid>&vigencia=POR_VENCER`. El campo `estado` del modelo (`ACTIVA`, `VENCIDA`, `CANCELADA`) se conserva aparte por compatibilidad y para el ciclo operativo.
