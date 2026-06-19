# Módulo `device` (sensor / ESP32)

## Propósito

Concentra el **único transporte WebSocket**, la ingestión de mensajes del microcontrolador, la **calibración**, los **perfiles de espirómetro**, la **estimación de volumen** y las pantallas de conexión y calibración técnica. En el flujo **local con sensor**, el ESP32 transmite distancia medida por el **VL53L0X**; la aplicación convierte esa señal en **volumen inspirado estimado (mL)** mediante el modelo de calibración activo. La conexión es **global** vía `SensorConnectionProvider` en `app/_layout.tsx`.

RESPIRA+ es un **prototipo académico** de apoyo a ejercicios respiratorios en **pacientes adultos postoperatorios**. Los volúmenes derivados de este módulo **no constituyen medición clínica certificada** ni diagnóstico (Instituto Tecnológico y de Estudios Superiores de Monterrey [ITESM], 2026; véase [Seguridad clínica](../../../docs/08-clinical-safety/README.md)).

---

## Relación con el flujo clínico y funcional

| Etapa | Rol de `device` |
|-------|-------------------|
| Conexión | El paciente enlaza la app móvil con el ESP32 por **WiFi local** antes de evaluación o terapia oficial con sensor. |
| Evaluación inicial (VIM) | Provee volumen estimado en tiempo real para los tres intentos oficiales. |
| Terapia gamificada | `useActiveVolumeEstimate` alimenta validación de intentos en `session/`; sin señal viva no se reutiliza el último volumen. |
| Historial y exportación | Los metadatos de calibración y sensor se persisten en registros de sesión consumidos por `history/` y `export/`. |

**Modo local con sensor** (ESP32 + VL53L0X + WebSocket): pipeline completo descrito abajo.

**Modo touch / web / demo**: no utiliza este transporte ni el modelo de distancia→volumen del hardware. La práctica táctil simula entrada en `session/`; en web/PWA no hay conexión ESP32. Ver [Web, PWA y runtime-env](../../../docs/12-web-cloud-migration/README.md).

---

## Carpetas

| Carpeta | Rol |
|---------|-----|
| `websocket/` | `Esp32WebSocketClient` — no crear otro cliente en la app |
| `ingestion/` | `parseSensorMessage` → `SensorReading` |
| `adapters/` | `useEsp32WebSocketSensor` (mock / websocket) |
| `state/` | `SensorConnectionProvider`, `useCalibrationSnapshot` |
| `spirometer/` | Perfil activo RESPIRA+ 3000 mL; legacy 5000 mL en storage |
| `calibration/` | Modelo predeterminado, captura técnica, incertidumbre, storage activo |
| `volume-estimation/` | `useActiveVolumeEstimate`, compuerta de terapia |
| `components/` | `VolumeThermometer`, `SensorLivePreview`, etc. |
| `screens/` | `SensorConnectionScreen`, `SensorCalibrationScreen`, `HardwareLabScreen` |
| `mocks/` | `mock-sensor-readings` (lecturas de prueba sin hardware; solo diagnóstico) |
| `types/` | Contratos de lectura y conexión |

---

## Flujo de datos (local con sensor)

1. ESP32 envía JSON por WebSocket (**solo distancia**: `distanceMm`, `rawDistanceMm`, `distanceValid`).
2. `Esp32WebSocketClient` recibe y parsea con `parseSensorMessage`.
3. `useEsp32WebSocketSensor` actualiza estado (modo `mock` o `websocket`).
4. `SensorConnectionProvider` expone lectura y controles a toda la app.
5. `useActiveVolumeEstimate` aplica el **modelo activo** (lineal predeterminado RESPIRA+ 3000 mL, banco 2-jun-2026: `28.663249… × distanceMm − 523.826…`) y calcula `volumeMl` a partir de `distanceMm`.
6. Terapia y conexión consumen el mismo stream; **no abren sockets adicionales**.
7. Si la señal deja de estar viva, la terapia **no reutiliza** el último volumen.

Detalle metrológico y modelo canónico: [Calibración](../../../docs/05-calibration/README.md), [Validación académica](../../../docs/09-academic-validation/README.md).

---

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/sensor-connection` | Conexión, termómetro de volumen, estado de señal |
| `/sensor-calibration` | Calibración técnica (solo con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION`) |
| `/hardware-lab` | Hub de diagnóstico (acceso según `app-mode`) |
| `/esp32-raw-test` | Prueba mínima WS (solo con `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG`) |

---

## Variables de entorno (relacionadas)

| Variable | Efecto en device |
|----------|------------------|
| `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` | Bypass consentimiento en rutas sensor (`__DEV__`) |
| `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG` | Diagnóstico avanzado, distancia, JSON, laboratorio hardware |
| `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION` | Calibración multi-volumen, U95, export CSV en UI |
| `EXPO_PUBLIC_ENABLE_CLOUD_AUTH` | Influencia acceso a Hardware Lab |

---

## Separación con sesión e historial

- **Calibración y modelos** viven aquí; la sesión solo consume estimaciones y valida intentos.
- **Historial/exportación** leen campos persistidos en `session` (`input_mode`, volúmenes sensor, U95).

---

## Límites del módulo

- No persiste sesiones clínicas ni VIM; solo modelos de calibración y estado de conexión.
- No sustituye espirometría hospitalaria ni emite informes médicos.
- En builds web/demo o práctica táctil, el pipeline ESP32 no aplica al flujo terapéutico oficial.
- La calibración técnica avanzada es herramienta de banco/diagnóstico, no requisito del paciente en flujo estándar.

---

## Documentación canónica

- [Dispositivo y sensor](../../../docs/04-device-and-sensor/README.md) · [Flujo del sensor](../../../docs/04-device-and-sensor/sensor-flow.md)
- [Calibración](../../../docs/05-calibration/README.md) · [Calibración (módulo)](./calibration/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Validación académica](../../../docs/09-academic-validation/README.md)
- [QA y auditorías](../../../docs/10-testing-and-validation/README.md)
- [Sesión de terapia](../../../docs/03-features/sesion-terapia.md) · [Evaluación inicial](../../../docs/03-features/evaluacion-inicial.md)

Doc histórica de flujo: [sensor-flow.md](../../../docs/sensor-flow.md) (raíz `docs/`).

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Validación académica — RESPIRA+* [Documento interno del repositorio]. `docs/09-academic-validation/README.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.
