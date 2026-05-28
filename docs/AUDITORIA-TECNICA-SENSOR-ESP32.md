# RESPIRA+ — Auditoría técnica: sensor, ESP32, WebSocket y calibración

**Fecha:** 26 de mayo de 2026  
**Alcance:** Conexión del sensor, adquisición ESP32, parser, WebSocket, visualización, calibración mm→mL, validación metrológica, errores del sensor e integración final.  
**Tipo:** Solo lectura — sin cambios en código.

---

## Contexto clínico y técnico

RESPIRA+ es un sistema de monitoreo y acompañamiento para **ejercicios respiratorios postoperatorios** con espirómetro incentivador volumétrico. El sistema usa un sensor **VL53L0X/GY-530** conectado a un **ESP32** para medir el desplazamiento del pistón del espirómetro.

La app estima **volumen inspirado en mL** a partir de la distancia en mm, muestra biofeedback, registra intentos y valida repeticiones.

**El sistema NO mide presión inspiratoria, NO diagnostica función pulmonar y NO sustituye al profesional de salud.** Solo estima volumen inspirado a partir del desplazamiento del pistón y calcula tiempo sostenido, repeticiones válidas, cumplimiento y progreso.

**Curva preliminar de presentación (referencia histórica):**

```
V(mL) = 52.95 × distancia(mm) − 2251.97
R² = 0.9962, MAE = 41 mL
```

**Hallazgo:** Esta ecuación **no está hardcodeada** en el código actual. Fue reemplazada por calibración dinámica por espirómetro físico (regresión lineal o interpolación por tramos).

---

## 1. Resumen ejecutivo

El sistema RESPIRA+ tiene una arquitectura sensor→sesión **notablemente madura**:

- **Firmware ESP32:** Dos variantes relevantes — `respira_esp32_blindado_v1` (máquina de estados, botón, LED, reintentos) y `envio_datos_prueba2` (trazabilidad: `deviceId`, `firmwareVersion`, `sensorStatus`, `sampleCount`, `filter`). **Deben fusionarse** antes de producción.
- **App:** Parser defensivo, cliente WebSocket con cleanup, `SensorConnectionProvider` global, pantalla de conexión, prueba cruda, modo mock, timeout 9 s.
- **Calibración:** Multi-punto, modelos `linear_regression` y `piecewise_linear`, U95, validación geométrica, compuerta de terapia, persistencia por `spirometerDeviceId`.
- **Sesión:** Integración real con sensor vía `useLevelSensorVolume`; modo práctica táctil aislado; validación conservadora (`estimatedVolumeMl − U95 ≥ objetivo`).

| Pregunta | Veredicto |
|----------|-----------|
| ¿Listo para conexión física? | **Sí** |
| ¿Listo para calibración con espirómetro real? | **Sí** (tras montaje y firmware consolidado) |
| ¿Listo para sesión terapéutica con sensor? | **Tras calibración válida** |
| ¿Listo para uso clínico formal? | **No** — validación clínica pendiente |

---

## 2. Mapa de archivos relevantes

| Ruta | Función | Estado | Riesgo / comentario |
|------|---------|--------|---------------------|
| `arduino_codes/respira_esp32_blindado_v1/respira_esp32_blindado_v1.ino` | Firmware producción: FSM, botón D25, LED D26, AP, WS | Completo | Falta `deviceId`, `firmwareVersion`, `sensorStatus` en JSON; buffer 380 B |
| `arduino_codes/envio_datos_prueba2/envio_datos_prueba2.ino` | Fase 3D.2: trazabilidad metrológica completa | Completo | Sin FSM robusta; siempre transmite |
| `arduino_codes/envio_datos_prueba1/` | Primera versión sensor real | Legacy | **`while(true)`** si falla sensor al arranque |
| `arduino_codes/detectar_sensor/`, `distanceMm_real/` | Lectura serial VL53L0X | Prueba | Bloqueo infinito si no hay sensor |
| `arduino_codes/WebSocket/` | Datos simulados | Legacy | Sin hardware |
| `arduino_codes/respira_ws_test.html` | Prueba navegador WS | Diagnóstico | — |
| `src/modules/device/websocket/esp32-websocket-client.ts` | Cliente WS + parseo | Completo | Sin auto-reconexión |
| `src/modules/device/adapters/use-esp32-websocket-sensor.ts` | Hook: estados, mock, métricas | Completo | Timeout 9 s; sin backoff |
| `src/modules/device/state/SensorConnectionProvider.tsx` | Socket único global | Completo | — |
| `src/modules/device/ingestion/parse-sensor-message.ts` | JSON → `SensorReading` | Completo | Tolera campos faltantes |
| `src/modules/device/types/sensor-reading.ts` | Tipos de lectura y conexión | Completo | — |
| `src/modules/device/components/SensorLivePreview.tsx` | Barra 0–100 % distancia | Completo | MIN/MAX 30–180 mm hardcodeados |
| `app/esp32-raw-test.tsx` | WS crudo sin pipeline app | Completo | Aislado; sin auto-reconexión |
| `src/modules/device/screens/SensorConnectionScreen.tsx` | Conexión + calibración + debug | Completo | — |
| `src/modules/device/calibration/*` | Calibración completa | Completo | Ver sección 5 |
| `src/modules/device/volume-estimation/*` | Estimación en vivo + readiness | Completo | — |
| `src/modules/session/screens/SessionScreen.tsx` | Sesión sensor / táctil | Completo | Complejo |
| `src/modules/session/sensor/use-level-sensor-volume.ts` | Volumen en sesión (throttle 120 ms) | Completo | — |
| `src/modules/session/sensor-evaluation/*` | Validación intentos + U95 | Completo | Conservador |
| `docs/sensor-flow.md`, `src/modules/device/calibration/README.md` | Documentación | Actualizado | WiFi, no BLE |

---

## 3. Cadena de medición actual

### Flujo implementado (completo en ruta sensor; no simulado)

```
Pistón espirómetro
  → VL53L0X (I2C, GPIO 21 SDA / 22 SCL)
  → ESP32: lectura cada 50 ms, filtro EMA α = 0.35
  → JSON broadcast cada 100 ms (~10 Hz) vía WebSocket puerto 81
  → Esp32WebSocketClient.onmessage
  → parseSensorMessage → SensorReading
  → SensorConnectionProvider (contexto React global)
  → Rutas paralelas:
      A) SensorLivePreview → barra visual 0–100 % (distancia; NO volumen clínico)
      B) Modelo activo → estimateVolumeFromActiveModel
           → distanceMm → estimatedVolumeMl (clamp, U95, rango)
           → useLevelSensorVolume → SessionScreen
           → evaluateOfficialAttempt / evaluateSensorAttemptVolume
           → SessionResult → persistencia (AsyncStorage / Supabase opcional)
```

**Modo práctica táctil:** Ruta paralela con volumen simulado; no usa sensor; no cuenta para desbloqueo de niveles.

### Arquitectura app (capas)

```
ESP32 (firmware) → WebSocket → Esp32WebSocketClient
  → parseSensorMessage → useEsp32WebSocketSensor
  → SensorConnectionProvider → pantallas / hooks de sesión
```

**Regla:** un solo WebSocket global (`SensorConnectionProvider` en `app/_layout.tsx`). URL por defecto: `ws://192.168.4.1:81`.

---

## 4. Firmware ESP32 (detalle)

### 4.1 Firmware recomendado para integración: `respira_esp32_blindado_v1.ino`

| Parámetro | Valor |
|-----------|--------|
| AP SSID | `RESPIRA_ESP32` |
| AP password | `respira123` |
| IP ESP32 | `192.168.4.1` |
| HTTP | puerto 80 (página diagnóstico embebida) |
| WebSocket | `ws://192.168.4.1:81` |
| Lectura sensor | 50 ms (20 Hz) |
| Envío WS | 100 ms (10 Hz) |
| Filtro | EMA, `FILTER_ALPHA = 0.35` |
| Fuera de rango VL53L0X | `RangeStatus == 4` → `distanceValid = false`, distancias -1 |
| Buffer JSON | **380 bytes** (`snprintf`) |
| `source` | `"raw_sensor"` |
| Bloqueos | **Ninguno** en `loop()` |
| Arranque seguro | Sí: entra `ERROR_SENSOR` o `ERROR_WIFI` sin bloquear |

**Estados (`DeviceState`):** `BOOTING`, `IDLE`, `WAITING_FOR_APP`, `STREAMING`, `ERROR_SENSOR`, `ERROR_WIFI`.

**JSON enviado (blindado):**

```json
{
  "source": "raw_sensor",
  "volumeMl": 0,
  "sustainedTimeMs": 0,
  "validRepetitions": 0,
  "distanceMm": <filtrado>,
  "rawDistanceMm": <crudo>,
  "distanceValid": true|false,
  "flowState": "idle",
  "isValidAttempt": false,
  "timestamp": <millis desde boot>
}
```

**Nota:** `volumeMl`, `sustainedTimeMs`, etc. van en **0** en firmware; la lógica clínica está en la app.

**Botón GPIO 25:** pulsación corta inicia espera/streaming; larga (2 s) cancela.  
**LED GPIO 26:** apagado=idle, parpadeo 500 ms=esperando app, encendido=streaming, parpadeo rápido=error.

### 4.2 Firmware con trazabilidad: `envio_datos_prueba2.ino`

| Parámetro | Valor |
|-----------|--------|
| `FIRMWARE_VERSION` | `respira-fw-0.6.0` |
| `DEVICE_ID` | `RESPIRA-ESP32-001` |
| `FILTER_LABEL` | `ema_0.35` |
| `source` | `"vl53l0x"` |
| Buffer JSON | **512 bytes** |
| `sensorStatus` | `initializing` \| `ok` \| `out_of_range` \| `error` |
| `sampleCount` | incrementa en lecturas válidas |
| FSM / botón / LED | **No** |
| Transmisión | Siempre (sin depender de cliente en algunos modos) |

**JSON extendido:**

```json
{
  "source": "vl53l0x",
  "deviceId": "RESPIRA-ESP32-001",
  "firmwareVersion": "respira-fw-0.6.0",
  "timestampMs": <millis>,
  "timestamp": <millis>,
  "rawDistanceMm": <int>,
  "distanceMm": <int>,
  "distanceValid": true|false,
  "sensorStatus": "ok|out_of_range|error|initializing",
  "sampleCount": <ulong>,
  "filter": "ema_0.35",
  "volumeMl": 0,
  "sustainedTimeMs": 0,
  "validRepetitions": 0,
  "flowState": "idle",
  "isValidAttempt": false
}
```

### 4.3 Evolución de firmwares en `arduino_codes/`

| Sketch | Rol | Riesgo principal |
|--------|-----|------------------|
| `pruebaInicia_ESP32` | Smoke test | — |
| `access_point_RESPIRA_ESP32` | Solo AP WiFi | — |
| `WebSocket` | Datos simulados | — |
| `envio_datos_prueba1` | 50 Hz / 20 Hz WS, sin filtro | **Bloqueo infinito** sin sensor |
| `detectar_sensor` / `distanceMm_real` | Serial 10 Hz | **Bloqueo infinito** sin sensor |
| `prueba_boton_conexion` | Botón + LED aislado | — |
| `envio_datos_prueba2` | Trazabilidad 3D.2 | Sin FSM |
| `respira_esp32_blindado_v1` | **Producción candidato** | Sin campos 3D.2 |

---

## 5. App: conexión y WebSocket

### Comportamiento

| Aspecto | Implementación |
|---------|----------------|
| URL por defecto | `ws://192.168.4.1:81` |
| Conexión | Manual (`connect` / `disconnect` / `resetConnection`) |
| Auto-reconexión | **No** (diseño actual) |
| Timeout conexión | 9 s → error + disconnect |
| Duplicados | Cliente cierra socket anterior antes de abrir otro |
| Cleanup unmount | Sí (hook + `esp32-raw-test`) |
| Errores parseo | No tumba conexión; `onParseError` |
| Mock | `startMock` / `stopMock`, ~900 ms entre lecturas |
| Offline sin internet | Sí: AP local; Supabase opcional (`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`) |
| Modo `offline_sensor_test` | `__DEV__` + `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST=true`; bypass consentimiento |

### Pantallas

- **`/sensor-connection`** — `SensorConnectionScreen`: conexión principal, calibración, `SensorLivePreview`, debug.
- **`/esp32-raw-test`** — WebSocket directo, sin `parseSensorMessage` del pipeline (diagnóstico).
- **`/hardware-lab`** — laboratorio hardware (gated por env).

### Parser (`parse-sensor-message.ts`)

- Acepta: `volumeMl`, `sustainedTimeMs`, `validRepetitions`, `distanceMm`, `rawDistanceMm`, `distanceValid`, `flowState`, `isValidAttempt`, `source`, `firmwareVersion`, `deviceId`, `timestamp` / `timestampMs`, `sensorStatus`, `sampleCount`, `filter`.
- Normaliza faltantes: volumen/repeticiones → **0** (no descarta lectura).
- `timestamp`: usa `timestamp` o `timestampMs` o `Date.now()`.
- **Riesgo mitigado:** JSON inválido → `null`; no se fabrica lectura válida sin datos.

---

## 6. Calibración distancia (mm) → volumen (mL)

### ¿Existe la ecuación de presentación en código?

**No.** Búsqueda de `52.95` y `2251.97`: **0 coincidencias**.

### Sistema implementado

1. **Captura** en `SensorCalibrationScreen`: pares (volumen marcado mL, distancia mm) con repeticiones.
2. **Perfil** `CalibrationProfile` en AsyncStorage por `spirometerDeviceId`.
3. **Modelos:**
   - `linear_regression`: OLS `V = slope × d + intercept`
   - `piecewise_linear`: interpolación entre promedios por volumen
4. **Recomendación** automática (`recommendCalibrationModel`) con umbrales R², RMSE, MAE.
5. **Modelo activo** `ActiveCalibrationModel` con curva, U95, flags `isReadyForTherapy`.
6. **Estimación en vivo** `estimateVolumeFromActiveModel`: clamp a rango calibrado, advertencias fuera de rango.

### Constantes metrológicas clave (`calibration-constants.ts`)

| Constante | Valor | Uso |
|-----------|-------|-----|
| `MIN_RELIABLE_SENSOR_DISTANCE_MM` | 30 | Distancia mínima fiable |
| `MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY` | 30 | Puntos mínimos terapia |
| `MIN_REPETITIONS_PER_REQUIRED_VOLUME` | 5 | Por volumen obligatorio |
| `MAX_ACCEPTABLE_STD_DISTANCE_MM` | 5 | Repetibilidad |
| `UNCERTAINTY_COVERAGE_FACTOR_K` | 2 | U95 ~95 % |
| `UNCERTAINTY_MAX_ACCEPTABLE_U95_ML` | 250 | Límite aceptable |
| `SENSOR_RELATIVE_UNCERTAINTY` | 0.03 | 3 % |
| `REFERENCE_VOLUME_PER_MM_ML` | 50 (deprecated) | 500 mL / 10 mm paso geométrico |

### Protocolo mínimo terapia

- 6 volúmenes obligatorios (perfil 5000 mL: 500, 1000, 1500, 2000, 2500, 3000 mL).
- ≥ 5 mediciones válidas por volumen obligatorio.
- ≥ 30 puntos válidos totales.
- Validación geométrica (≈10 mm por cada 500 mL en perfil 5000 mL).
- Incertidumbre U95 ≤ 250 mL.

### Seguridad en estimación

- Valores negativos / fuera de rango: **clamp** + `clamped: true` + estado `out_of_range_*`.
- UI: volumen como **estimado**; `SensorLivePreview` declara *"Vista de distancia (no es volumen estimado)"*.
- Calibración **trazable**: `calibrationProfileId`, `activeModelId`, `modelKind` en sesión e intentos.

### Entrada para calibrar

- Usar **`distanceMm` filtrado** (coherente con summaries de calibración).
- `rawDistanceMm` se guarda para diagnóstico y export.

---

## 7. Validación de intentos respiratorios

### Configuración por nivel (`level-difficulty-config.ts`)

| Nivel | `targetVolumeMultiplier` | `requiredHoldMs` | `restMs` |
|-------|--------------------------|------------------|----------|
| 1 | 1.0× | 3000 | 3000 |
| 2 | 1.05× | 3000 | 2800 |
| 3 | 1.1× | 3500 | 2800 |
| 4 | 1.15× | 3500 | 2500 |
| 5 | 1.2× | 4000 | 2500 |

`targetVolume` = VIM diagnóstico × multiplicador, acotado al rango calibrado (`resolveSafeLevelTargetVolume`).

### Motor nivel 1

- Fases: ascenso 2 s → evaluación oficial (`requiredHoldMs`) → resultado.
- Intento válido (juego): obstáculo superado + tiempo en zona clara ≥ umbral.
- **Sensor:** inicio inspiración cuando `estimatedVolumeMl` ≥ max(60, 7 % del objetivo).
- Pico de volumen: `peakSensorVolumeRef` durante intento.

### Validación oficial con sensor

`evaluateSensorAttemptVolume`:

1. Fuera de rango / clamped → `out_of_range`
2. **`lowerBoundMl ≥ targetVolumeMl`** → `target_reached` (confianza alta)
3. Estimación ≥ objetivo pero borde inferior no → `uncertain`
4. Por debajo → `volume_below_target`

`evaluateOfficialAttempt`: intento válido solo si **`reachesTargetConservatively`** (U95) **y** `holdMs ≥ requiredHoldMs`.

### Modo práctica táctil

- `inputMode=touch_practice`: volumen simulado por tiempo de presión; **no** alimenta desbloqueo ni metrología sensor.

### Persistencia

- `TARGET_ATTEMPTS = 10` por sesión; `TARGET_PERFECT_SESSIONS = 6` para desbloquear siguiente nivel.
- Campos por intento: `distance_mm`, `sensor_estimated_volume_ml`, `sensor_u95_ml`, `in_calibrated_range`, `clamped`, trazas firmware.

---

## 8. Hallazgos críticos

| ID | Severidad | Hallazgo |
|----|-----------|----------|
| H1 | **Alto** | Dos firmwares divergentes sin consolidar (FSM vs trazabilidad) |
| H2 | **Alto** | Buffer JSON 380 B en blindado insuficiente si se añaden campos 3D.2 |
| H3 | **Medio** | Sin reconexión automática WebSocket en app |
| H4 | **Medio** | `timestamp` = `millis()` desde boot, no hora real |
| H5 | **Medio** | `source` distinto: `raw_sensor` vs `vl53l0x` |
| H6 | **Medio** | `SensorLivePreview` MIN/MAX 30–180 mm fijos |
| H7 | **Bajo** | No distingue “sin WiFi al AP” vs “sensor caído” en mensajes UI |
| H8 | **Bajo** | En v0.6, fuera de rango: `distanceMm` puede conservar último filtrado (app usa `distanceValid`) |

### Firmware legacy (no usar en producción)

- **`envio_datos_prueba1`**, **`detectar_sensor`**, **`distanceMm_real`**: `while(true)` si falla sensor al arrancar.

---

## 9. Riesgos metrológicos

| Riesgo | Severidad | Mitigación actual | Acción |
|--------|-----------|-------------------|--------|
| Sin calibración física | Crítico | UI + readiness gate | Ejecutar protocolo con espirómetro real |
| Inversión dirección sensor | Alto | `INVERT_DIRECTION`, `determineVolumeDistanceRelation` | Verificar montaje |
| Ruido | Medio | EMA firmware; std en calibración | Ajustar α si hace falta |
| Latencia | Bajo | 10 Hz; WiFi local | Medir en P7 |
| Pérdida paquetes | Medio | Contador mps en UI | Log gaps si aparecen |
| Timestamp no absoluto | Medio | Fallback `Date.now()` en app | RTC/NTP opcional |
| Sensor mal alineado | Alto | Validación geométrica | Montaje + calibración |
| Datos inválidos como válidos | Medio | Cadena `distanceValid` + U95 + official eval | Prueba P8 |
| Calibración no trazable | Bajo | IDs en sesión/export | Verificar CSV export v2.1.0 |

---

## 10. Recomendaciones técnicas priorizadas

### A. Indispensable

| # | Acción |
|---|--------|
| R1 | **Fusionar firmwares:** FSM de `respira_esp32_blindado_v1` + campos de `envio_datos_prueba2`; buffer ≥ 512 B |
| R2 | **Calibración real** con espirómetro Besmed (perfil 5000 mL): 6 volúmenes × ≥5 repeticiones |
| R3 | Verificar **`INVERT_DIRECTION`** y rango visual con montaje real |

### B. Defendible metrológicamente

| # | Acción |
|---|--------|
| R4 | Reconexión automática con backoff exponencial |
| R5 | Mensajes UI: no conectado al AP vs error de sensor |
| R6 | `SensorLivePreview`: MIN/MAX desde modelo activo |
| R7 | Log de latencia y gaps > 300 ms |

### C. Opcional

| # | Acción |
|---|--------|
| R8 | RTC / NTP en ESP32 |
| R9 | Heartbeat ping/pong WS |
| R10 | Tests unitarios parser con JSON de ambos firmwares |

---

## 11. Pruebas recomendadas

| ID | Prueba | Procedimiento | Criterio de éxito |
|----|--------|---------------|-------------------|
| P1 | Conexión | AP `RESPIRA_ESP32` → app Sensor → Conectar | `receiving`, >8 msg/s, `distanceMm` numérico |
| P2 | Estabilidad | Objeto fijo ~100 mm, 60 s | Variación ≤3 mm (`distanceMm`), `distanceValid` true |
| P3 | Fuera de rango | Retirar objeto | `distanceValid` false, sin crash |
| P4 | Pérdida conexión | Apagar ESP32, reconectar | Estado error/disconnected; recuperación manual |
| P5 | Calibración marcas | 500–3000 mL, 5+ puntos/volumen | Modelo `ready`, protocolo cumplido |
| P6 | Repetibilidad | 10 repeticiones mismo volumen | sd ≤ 5 mm |
| P7 | Latencia | Movimiento rápido pistón | Retardo percibido < 200 ms |
| P8 | Sesión real | Nivel 1 con calibración activa, 10 intentos | Intentos válidos/inválidos coherentes; `SessionResult` con trazas |

---

## 12. Veredicto final

### ¿Listo para calibración física?

**Sí**, con firmware consolidado (R1) y montaje verificado (R3).

### ¿Listo para integración con sesión terapéutica?

**Sí, después de calibración** que pase `isReadyForTherapy` y compuerta `evaluateLevelSensorReadiness`.

### ¿Qué falta antes de medir con el espirómetro real?

1. Fusionar firmware (R1)  
2. Montar sensor y verificar dirección (R3)  
3. Ejecutar calibración completa (R2)  
4. Activar modelo y verificar readiness  
5. Prueba end-to-end P8  

### Archivos a modificar tras la auditoría

| Archivo | Cambio |
|---------|--------|
| `arduino_codes/respira_esp32_blindado_v1/respira_esp32_blindado_v1.ino` | Añadir trazabilidad 3D.2; buffer 512 |
| `arduino_codes/envio_datos_prueba2/envio_datos_prueba2.ino` | Deprecar tras fusión |
| `src/modules/device/components/SensorLivePreview.tsx` | Opcional: rango desde calibración |
| `src/modules/device/adapters/use-esp32-websocket-sensor.ts` | Opcional: auto-reconexión |

---

## 13. Documentación relacionada en el repo

| Documento | Contenido |
|-----------|-----------|
| `README.md` | Visión general, WiFi, postoperatorio |
| `docs/sensor-flow.md` | Flujo conexión → calibración → terapia |
| `src/modules/device/calibration/README.md` | Calibración canónica (matemática, firmware) |
| `docs/calibration/README.md` | Índice a calibración |
| `src/modules/device/README.md` | Módulo device |
| `src/modules/session/README.md` | Módulo sesión |
| `README_CLOUD_FREEZE.md` | Modo local-first / Supabase |

### Coherencia documentación vs código

| Tema | Estado |
|------|--------|
| WiFi / WebSocket (no BLE) | Coherente |
| Expo / TypeScript (no Python en app) | Coherente |
| Postoperatorio (no EPOC como foco) | Coherente en README y tipos |
| Presión inspiratoria | No se mide; documentado |
| Lenguaje clínico | Apropiado; disclaimers de validación pendiente |

**Inconsistencia menor:** dos PDFs legales (`assets/legal/terminos-uso-etico.pdf` vs `assets/docs/respira-legal-v1.pdf`); solo uno referenciado por código.

---

## 14. Variables de entorno relevantes

| Variable | Efecto |
|----------|--------|
| `EXPO_PUBLIC_ENABLE_CLOUD_AUTH` | `false` → local-first, sin Supabase obligatorio |
| `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` | Modo prueba sensor offline (`__DEV__`) |
| `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG` | Detalles técnicos en conexión + ruta raw test |
| `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE` | Modo práctica táctil |

---

## 15. Conclusión

La arquitectura **sensor → calibración → sesión** está **avanzada, tipada y defensiva**, con trazabilidad metrológica en persistencia y export. El sistema está **listo para la fase de montaje físico, fusión de firmware y calibración con espirómetro real**. No está listo para afirmaciones de producto sanitario validado sin estudios clínicos adicionales.

---

*Documento generado por auditoría técnica de solo lectura. No modifica el comportamiento del producto.*
