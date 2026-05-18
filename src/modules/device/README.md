# Módulo `device` (sensor / ESP32)

Concentra el **único transporte WebSocket**, ingestión de mensajes, **calibración**, **perfiles de espirómetro**, **estimación de volumen** y pantallas de conexión/calibración. La conexión es **global** vía `SensorConnectionProvider` en `app/_layout.tsx`.

---

## Carpetas

| Carpeta | Rol |
|---------|-----|
| `websocket/` | `Esp32WebSocketClient` — no crear otro cliente en la app |
| `ingestion/` | `parseSensorMessage` → `SensorReading` |
| `adapters/` | `useEsp32WebSocketSensor` (mock / websocket) |
| `state/` | `SensorConnectionProvider`, `useCalibrationSnapshot` |
| `spirometer/` | Perfiles 5000 / 3000 mL y dispositivos físicos |
| `calibration/` | Captura, modelos, incertidumbre, storage activo |
| `volume-estimation/` | `useActiveVolumeEstimate`, compuerta de terapia |
| `components/` | `SensorLivePreview`, etc. |
| `screens/` | `SensorConnectionScreen`, `SensorCalibrationScreen`, `HardwareLabScreen` |
| `mocks/` | `mock-sensor-readings` (lecturas de prueba sin hardware; solo diagnóstico) |
| `types/` | Contratos de lectura y conexión |

---

## Flujo de datos

1. ESP32 envía JSON por WebSocket.
2. `Esp32WebSocketClient` recibe y parsea con `parseSensorMessage`.
3. `useEsp32WebSocketSensor` actualiza estado (modo `mock` o `websocket`).
4. `SensorConnectionProvider` expone lectura y controles a toda la app.
5. `useActiveVolumeEstimate` aplica el **modelo activo** del espirómetro seleccionado.
6. Terapia y calibración consumen el mismo stream; **no abren sockets adicionales**.

---

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/sensor-connection` | Conexión, selección de espirómetro, enlace a calibración |
| `/sensor-calibration` | Calibración, repetibilidad, U95, modelo activo |
| `/hardware-lab` | Hub de diagnóstico (acceso según `app-mode`) |
| `/esp32-raw-test` | Prueba mínima WS (solo con `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG`) |

---

## Variables de entorno (relacionadas)

| Variable | Efecto en device |
|----------|------------------|
| `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` | Bypass consentimiento en rutas sensor (`__DEV__`) |
| `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG` | Diagnóstico avanzado, laboratorio de hardware y prueba WebSocket |
| `EXPO_PUBLIC_ENABLE_CLOUD_AUTH` | Influencia acceso a Hardware Lab |

---

## Separación con sesión e historial

- **Calibración y modelos** viven aquí; la sesión solo consume estimaciones y valida intentos.
- **Historial/exportación** leen campos persistidos en `session` (`input_mode`, volúmenes sensor, U95).

Ver también: [docs/sensor-flow.md](../../../docs/sensor-flow.md), [docs/calibration/README.md](../../../docs/calibration/README.md).
