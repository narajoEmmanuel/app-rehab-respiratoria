# Hardware Lab

## Propósito

Documentar rutas y flags de diagnóstico hardware (desarrollo / validación), separadas del flujo paciente estándar.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Pantalla lab | `src/modules/device/screens/HardwareLabScreen.tsx` |
| Ruta | `app/hardware-lab.tsx` |
| Raw WS test | `app/esp32-raw-test.tsx` |
| Flags | `src/modules/app-mode/app-mode-config.ts` |
| Contexto modo | `src/modules/app-mode/app-mode-context.tsx` |
| Conexión (enlace) | `src/modules/device/screens/SensorConnectionScreen.tsx` |

## Flujo técnico

Acceso a `/hardware-lab` cuando `isHardwareLabAccessible()`:

- Cloud auth **desactivado** (`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`), **o**
- `__DEV__` + `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST=true`.

`HardwareLabScreen` puede activar modo `offline_sensor_test` vía `AppModeProvider`.

Superficies debug (`EXPO_PUBLIC_ENABLE_SENSOR_DEBUG=true` + `__DEV__`):

- Enlaces a hardware lab, raw WS test, telemetría/mock en conexión sensor.

## Datos y persistencia

No persiste datos clínicos propios; usa mismo `SensorConnectionProvider`.

## Riesgos

- Confundir lab con flujo paciente en demos clínicas.
- `offline_sensor_test` puede relajar guards de consent en rutas sensor — solo dev acordado.

## Pendientes o revisión manual

- Matriz exacta consent + offline_sensor_test — validar en `ConsentStackGuard` y `app-mode`.

## Checklist manual mínimo

- [ ] Con flags off: lab no accesible o pantalla bloqueada.
- [ ] Con cloud off: lab accesible desde flujo sensor.
- [ ] Raw test muestra tráfico WS.
- [ ] Volver a inicio no deja modo test colgado — **requiere revisión manual**.

## Docs relacionados

- [Sensor flow](./sensor-flow.md)
- [WebSocket protocol](./websocket-protocol.md)
