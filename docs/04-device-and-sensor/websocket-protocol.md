# Protocolo WebSocket

## Propósito

Documentar transporte local ESP32 ↔ app: URL, parseo de mensajes y campos de `SensorReading`.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Cliente | `src/modules/device/websocket/esp32-websocket-client.ts` |
| Parseo | `src/modules/device/ingestion/parse-sensor-message.ts` |
| Tipos | `src/modules/device/types/sensor-reading.ts` |
| Hook conexión | `src/modules/device/adapters/use-esp32-websocket-sensor.ts` |
| Mock | `src/modules/device/mocks/` |
| Test mínimo | `app/esp32-raw-test.tsx` |

## Flujo técnico

1. `Esp32WebSocketClient.connect(url)` abre socket.
2. `onmessage` recibe string JSON.
3. `parseSensorMessage(raw)` → `SensorReading | null`.
4. Callbacks alimentan `SensorConnectionProvider` y UI.

**URL por defecto:** `ws://192.168.4.1:81`  
**Red:** AP `RESPIRA_ESP32`, IP ESP32 `192.168.4.1`.

## Datos de entrada (payload JSON típico)

Campos reconocidos en `parse-sensor-message.ts`:

| Campo | Tipo | Notas |
|-------|------|-------|
| `distanceMm` | number | Distancia filtrada/usada |
| `rawDistanceMm` | number | Distancia cruda VL53L0X |
| `distanceValid` | boolean | Validez reportada |
| `timestamp` / `timestampMs` | number | Marca temporal |
| `source` | string | ej. `raw_sensor`, `processed`, `websocket` |
| `firmwareVersion` | string | Trazabilidad |
| `deviceId` | string | ID ESP32 |
| `sensorStatus` | string | ej. `ok`, `out_of_range`, `initializing`, `error` |
| `filter` | string | ej. filtro EMA en firmware |
| `flowState` | string | `idle` \| `inhaling` \| `holding` \| `exhaling` |
| `volumeMl`, `sustainedTimeMs`, `validRepetitions` | number | Stub 0 en firmware actual; app calcula volumen clínico |

Payloads inválidos → `null` (descartados con log en debug).

## Datos de salida

`SensorReading` (`sensor-reading.ts`) — usado por estimación de volumen y validación de intentos.

**No incluye presión inspiratoria.**

## Estados de conexión

| Tipo | Valores |
|------|---------|
| `SensorConnectionStatus` | `idle`, `connecting`, `connected`, `receiving`, `error`, `disconnected` |
| `SensorStreamState` | `idle`, `connected_waiting_stream`, `receiving_data`, `stream_paused` |

Modo fuente: `SensorSourceMode` = `mock` | `websocket` (mock solo dev).

## Riesgos

- WebSocket no disponible en algunos entornos web — **requiere revisión manual**.
- JSON malformado: lectura perdida; no debe crashear app.
- `volumeMl` en payload no debe usarse como volumen clínico en producción.

## Pendientes o revisión manual

- Esquema JSON formal versionado en firmware vs app — no hay campo `schemaVersion` hoy.
- Sincronizar con HTML diagnóstico en firmware (`http://192.168.4.1/`).

## Checklist manual mínimo

- [ ] `esp32-raw-test` muestra mensajes crudos (flag `SENSOR_DEBUG`).
- [ ] `distanceMm` y `rawDistanceMm` presentes en stream activo.
- [ ] Parse error no tumba provider.
- [ ] Reconnect tras pérdida AP.

## Docs relacionados

- [Firmware ESP32](./esp32-firmware.md)
- [Flujo sensor](./sensor-flow.md)
