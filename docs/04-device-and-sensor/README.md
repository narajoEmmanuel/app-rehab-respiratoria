# Dispositivo y sensor — Índice

Documentación técnica del ESP32, sensor VL53L0X, WebSocket local y su relación con la estimación de volumen **inspirado estimado** (no presión inspiratoria).

| Documento | Contenido |
|-----------|-----------|
| [sensor-flow.md](./sensor-flow.md) | Flujo conexión → volumen → terapia → historial |
| [websocket-protocol.md](./websocket-protocol.md) | URL, parseo JSON, `SensorReading` |
| [esp32-firmware.md](./esp32-firmware.md) | Sketch Arduino, AP, payload |
| [hardware-lab.md](./hardware-lab.md) | Rutas dev, flags, lab hardware |

## Principio clínico-técnico

- El **firmware envía distancia** (`distanceMm`, `rawDistanceMm`, `distanceValid`).
- La **app calcula volumen estimado** (mL) con calibración activa.
- Sesión **oficial** usa sensor + modelo; **práctica táctil** no usa este pipeline.

## Referencias en repo

- Módulo: [src/modules/device/README.md](../../src/modules/device/README.md)
- Calibración: [../05-calibration/README.md](../05-calibration/README.md)
- Datos: [../06-data-and-storage/README.md](../06-data-and-storage/README.md)
- Doc histórica: [../sensor-flow.md](../sensor-flow.md) (raíz `docs/`)
