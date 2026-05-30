# RESPIRA+

Sistema de monitoreo, biofeedback y acompañamiento para **ejercicios respiratorios postoperatorios** con **espirómetro incentivador**. La app guía sesiones por niveles, estima volumen a partir del sensor óptico, registra adherencia y permite exportar datos para seguimiento clínico en contexto de desarrollo y validación.

**Stack:** Expo · React Native · TypeScript · Expo Router · AsyncStorage · ESP32 (Wi‑Fi / WebSocket) · VL53L0X.

**Nube (opcional / congelada):** la integración Supabase y auth online pueden permanecer desactivadas durante el trabajo con hardware local. Detalle: [README_CLOUD_FREEZE.md](README_CLOUD_FREEZE.md).

---

## Alcance clínico

- Dirigida a **pacientes adultos en rehabilitación respiratoria postoperatoria**, con espirómetro incentivador y ejercicios de volumen, tiempo sostenido y adherencia.
- **No sustituye** indicación médica, diagnóstico ni supervisión profesional.
- El sistema está en **desarrollo avanzado** y **pendiente de validación clínica**; no debe interpretarse como producto sanitario validado.

### Contexto del cambio de enfoque

El proyecto comenzó orientado a **EPOC**. Tras revisión con especialista en rehabilitación pulmonar, el equipo redirigió el producto hacia **postoperatorios**: volumen objetivo, sostenimiento, constancia y registro de sesiones con sensor. La arquitectura actual (perfiles de espirómetro, calibración por unidad física, terapia con validación conservadora) refleja ese enfoque.

---

## Estado actual

| Área | Estado |
|------|--------|
| Conexión global ESP32 (WebSocket) | Implementada (`SensorConnectionProvider`) |
| Espirómetro activo | **RESPIRA+ 3000 mL** (único perfil en flujo paciente) |
| Calibración predeterminada | Modelo lineal validado por el equipo; clamp **0–3000 mL** |
| Estimación de volumen | **En la app** (`distanceMm` → mL); el ESP32 solo envía distancia |
| Calibración técnica multi-volumen | Implementada; **oculta** con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false` |
| Incertidumbre metrológica (U95) | Implementada; visible solo en modo técnico/debug |
| Validación geométrica / repetibilidad | Implementadas (modo técnico; perfil legacy 5000 mL) |
| Estimación de volumen en vivo | `useActiveVolumeEstimate` |
| UI paciente — volumen en conexión | Termómetro visual 0–3000 mL (`VolumeThermometer`) |
| Terapia — lecturas obsoletas | Bloqueadas; no se reutiliza el último volumen si la señal no está viva |
| Compuerta al iniciar terapia | `useTherapyReadinessGate` |
| Modo práctica táctil | Opt-in vía `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE` |
| Clasificación de sesiones | Sensor · Práctica · Sin clasificar |
| Historial / resumen / exportación | Distinguen origen; export técnico solo en modo técnico/debug |
| Supabase / auth online | Opcional; por defecto **local-first** |

### Modelo lineal predeterminado (RESPIRA+ 3000 mL)

```
Volumen (mL) = 32.566738232013954 × distanceMm − 1270.5786467848384
```

Resultado acotado entre **0** y **3000 mL**. Constantes en `predefined-calibration-models.ts`.

### Legacy (no activo en flujo paciente)

| Elemento | Notas |
|----------|--------|
| Perfil 5000 mL | Conservado en código/storage para migraciones; no es opción activa |
| Opción «Otro» espirómetro | Eliminada del flujo paciente |
| Calibración técnica en UI | Disponible solo con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true` |

---

## Funcionalidades principales

- Conexión **ESP32** por WiFi (AP `RESPIRA_ESP32`) y **WebSocket** (`ws://192.168.4.1:81`).
- **Espirómetro RESPIRA+ 3000 mL** con calibración lineal predeterminada instalada al primer uso.
- El **firmware envía distancia** (`distanceMm`, `rawDistanceMm`, `distanceValid`); la **app calcula el volumen** en mL.
- **Pantalla de conexión** con termómetro visual de volumen (0–3000 mL) y estado de señal en tiempo real.
- **Calibración técnica** multi-volumen, repetibilidad, U95 y export CSV — solo con flag de modo técnico.
- **Terapia guiada** (niveles) con validación al iniciar actividad y bloqueo de lecturas obsoletas.
- **Modo práctica táctil** (opcional, según configuración del dispositivo).
- **Historial**, **resumen** de sesión y **exportación clínica** (CSV / JSON, versión **2.1.0**).

---

## Arquitectura técnica

| Tecnología | Uso |
|------------|-----|
| **Expo ~54** | Toolchain, bundler, multiplataforma |
| **React Native** | UI |
| **TypeScript** | Tipado en `src/` |
| **Expo Router** | Rutas en `app/` |
| **AsyncStorage** | Persistencia local (sesiones, calibración, perfil) |
| **ESP32 + VL53L0X** | Distancia por WebSocket; volumen calculado en app |
| **WebSocket** | Un único cliente global en la app |
| **Supabase** | Opcional; congelado con `EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false` |

Documentación de módulos:

- [Módulo device (sensor)](src/modules/device/README.md)
- [Módulo session (terapia)](src/modules/session/README.md)
- [Flujo del sensor](docs/sensor-flow.md)
- [Calibración](docs/calibration/README.md)
- [Auditoría técnica sensor / ESP32 / calibración (mayo 2026)](docs/AUDITORIA-TECNICA-SENSOR-ESP32.md)

---

## Flujo del sensor (resumen)

```mermaid
flowchart LR
  A[Conectar sensor] --> B[Ver volumen en vivo]
  B --> C[Iniciar terapia]
  C --> D[Validar intentos]
  D --> E[Guardar sesión]
  E --> F[Historial / exportar]
```

En flujo paciente la calibración predeterminada RESPIRA+ 3000 mL se instala automáticamente; no requiere pasos manuales. La calibración técnica multi-volumen está disponible solo con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true`.

Detalle paso a paso: [docs/sensor-flow.md](docs/sensor-flow.md).

| Paso | Pantalla / ruta |
|------|-----------------|
| 1. Conectar + volumen en vivo | `/sensor-connection` |
| 2. Terapia y sesión | `/(tabs)/terapia` → `/(tabs)/sesion` |
| 3. Historial / exportación | `/(tabs)/historial`, `/(tabs)/resumen`, `/data-export` |
| Calibración técnica (solo flag) | `/sensor-calibration` |

---

## Perfil de espirómetro activo

Definido en `src/modules/device/spirometer/spirometer-profiles.ts` y `predefined-calibration-models.ts`.

| Concepto | Descripción |
|----------|-------------|
| **`SpirometerDevice`** | Unidad física RESPIRA+ 3000 mL (`spirometerDeviceId`) |
| **Calibración predeterminada** | Modelo lineal validado; se instala con `ensureRespira3000PredefinedCalibrationInstalled` |
| **Clamp de volumen** | 0–3000 mL en estimación y UI |
| **Cálculo de volumen** | En la app a partir de `distanceMm`; el ESP32 no envía volumen clínico |

| Perfil activo | ID | Rango UI | Modelo |
|---------------|-----|----------|--------|
| RESPIRA+ 3000 mL | `spirometer_3000ml_default` | 0–3000 mL | Lineal predeterminado |

### Legacy (referencia histórica)

| Perfil | ID | Notas |
|--------|-----|-------|
| 5000 mL (Besmed CIYO/TB-93500) | `spirometer_5000ml_default` | Perfil legacy; calibración multi-volumen y validación geométrica conservadas en código para migraciones. **No es opción activa** en flujo paciente. |

---

## Calibración

En **flujo paciente**, la calibración lineal predeterminada RESPIRA+ 3000 mL se aplica automáticamente. No hay pasos manuales ni pantalla de calibración visible (`EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false` por defecto).

| Regla (flujo paciente) | Valor |
|------------------------|--------|
| Modelo activo | Lineal: `32.566738… × distanceMm − 1270.5786…` |
| Clamp de volumen | 0–3000 mL |
| Origen del volumen | Calculado en app; ESP32 envía solo distancia |
| Bloqueo por distancia | `distanceMm < 30` mm (VL53L0X inestable) |
| Lecturas obsoletas en terapia | Bloqueadas si la señal no está viva |

### Calibración técnica (modo técnico)

Procedimiento completo en `SensorCalibrationScreen` y servicios bajo `src/modules/device/calibration/`. Solo accesible con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true`.

| Regla (modo técnico) | Valor |
|----------------------|--------|
| Volúmenes obligatorios | 6: 500, 1000, 1500, 2000, 2500, 3000 mL |
| Mediciones por volumen | 5 |
| Puntos mínimos para terapia | 30 |
| Incertidumbre U95 | Factor k=2; umbral máximo 250 mL |
| Validación geométrica | Solo perfil legacy 5000 mL |

Más detalle: [docs/calibration/README.md](docs/calibration/README.md).

---

## Modelos de estimación

| Modelo | Rol |
|--------|-----|
| **`linear_regression`** | Control de calidad y referencia simple |
| **`piecewise_linear`** | Recomendado cuando hay suficientes tramos y calidad |

Criterios relevantes (ver `calibration-model.ts` / `therapy-readiness-service.ts`):

- `isReadyForTherapy` — calibración y modelo aptos para sesión con sensor.
- `canEstimateWithinCalibratedRange` — volumen dentro del rango calibrado.
- **Modelo activo** persistido por espirómetro; la terapia no abre un segundo WebSocket.

Hook central: **`useActiveVolumeEstimate`** (`src/modules/device/volume-estimation/`).

---

## Terapia y sesión

| Modo | `inputMode` | `dataSource` | Validación oficial |
|------|-------------|--------------|-------------------|
| Sensor (por defecto) | `sensor` | `sensor_model` | `lowerBoundMl >= target` (conservador) + tiempo sostenido |
| Práctica táctil | `touch_practice` | `touch_simulation` | Simulación táctil; no mezclar con métricas de sensor |

- La **compuerta** al pulsar un nivel ejecuta `evaluateTherapyReadinessOnDemand` (conexión, modelo activo, rango).
- Con `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true`, si la compuerta falla puede ofrecerse **“Practicar sin sensor”**.
- Sesiones de práctica se marcan `is_practice_session: true` y se etiquetan en historial como **Práctica**.

---

## Historial y exportación

| Etiqueta UI | Condición |
|-------------|-----------|
| **Sensor** | `input_mode=sensor`, no práctica |
| **Práctica** | `touch_practice` / `is_practice_session` |
| **Sin clasificar** | Sesiones antiguas sin `input_mode` / `data_source` |

Exportación clínica: `CLINICAL_EXPORT_FORMAT_VERSION = '2.1.0'` — incluye clasificación, volúmenes estimados, U95, estado de intentos con sensor, etc. (`clinical-export-service.ts`, `clinical-csv-exporter.ts`).

---

## Variables de entorno

Copiar `.env.example` → `.env` ( **no subir** `.env` a Git).

| Variable | Default en ejemplo | Efecto |
|----------|-------------------|--------|
| `EXPO_PUBLIC_ENABLE_CLOUD_AUTH` | `false` | `false` = local-first sin login obligatorio |
| `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` | `false` | Bypass de consentimiento en rutas de sensor (solo `__DEV__`) |
| `EXPO_PUBLIC_ENABLE_SENSOR_DEBUG` | `false` | Diagnóstico avanzado: distancia, JSON, laboratorio hardware (solo `__DEV__`) |
| `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION` | `false` | Calibración técnica multi-volumen, U95 y export CSV en UI |
| `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE` | `false` | Botón “Practicar sin sensor” en terapia |

Opcionales para nube (solo si se reactiva auth):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

En desarrollo local puedes usar `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true` en `.env`; **`.env.example` permanece con `false`** por seguridad.

---

## Comandos

```bash
npm install
npx expo start -c
npx expo start --web -c
npx tsc --noEmit
npm run lint
```

Atajos: `npm run android` · `npm run ios` · `npm run web`.

**No ejecutar** `npm audit fix --force` sin acuerdo del equipo (puede romper el SDK de Expo).

---

## Rutas principales (Expo Router)

| Ruta | Contenido |
|------|-----------|
| `/` → `app/index.tsx` | Gate inicial (local o nube) |
| `/(tabs)/index` | Inicio |
| `/(tabs)/terapia` | Niveles / terapia |
| `/(tabs)/sesion` | Sesión activa (barra oculta) |
| `/(tabs)/historial` | Historial |
| `/(tabs)/resumen` | Resumen post-sesión |
| `/sensor-connection` | Conexión global, termómetro de volumen, estado de señal |
| `/sensor-calibration` | Calibración técnica (solo con flag técnico) |
| `/profile` | Perfil |
| `/data-export` | Exportación |
| `/hardware-lab` | Hub de diagnóstico (según modo) |
| `/esp32-raw-test` | WebSocket mínimo (solo debug) |

---

## Hardware ESP32 (referencia)

| Elemento | Valor |
|----------|--------|
| AP SSID | `RESPIRA_ESP32` |
| IP | `192.168.4.1` |
| WebSocket | `ws://192.168.4.1:81` |
| Microcontrolador | ESP32 WROOM 32 WiFi + Bluetooth 4.2 DevKit V1 |
| Sensor | VL53L0X (GY-530 ToF), I2C `0x29` |
| Payload típico | `source`, `distanceMm`, `rawDistanceMm`, `distanceValid`, `timestamp` |
| Volumen clínico | **No** lo calcula el firmware; la app convierte distancia → mL |

Firmware de referencia: `arduino_codes/envio_datos_stream_button/envio_datos_stream_button.ino`

---

## Estructura de carpetas

```
app/                          # Rutas Expo Router (delgadas)
src/modules/
  app-mode/                   # Flags de entorno (nube, debug, touch practice)
  device/
    adapters/                 # useEsp32WebSocketSensor
    calibration/              # Modelos, storage, incertidumbre
    components/               # VolumeThermometer, SensorLivePreview, etc.
    ingestion/                # parseSensorMessage
    mocks/                    # Lecturas simuladas (desarrollo)
    screens/                  # Conexión, calibración, Hardware Lab
    spirometer/               # Perfiles y dispositivos
    state/                    # SensorConnectionProvider, snapshots
    volume-estimation/        # useActiveVolumeEstimate, compuerta terapia
    websocket/                # Esp32WebSocketClient (único transporte)
  session/
    engine/                   # Nivel 1, touch adapter
    games/                    # UI de juego / hints de volumen
    screens/                  # SessionScreen
    sensor-evaluation/        # Validación oficial de intentos
    storage/                  # AsyncStorage sesiones
    types/ utils/ registry/
  history/ export/ summary/ home/
  levels/ patient/ legal/ diagnostics/
  auth/ notifications/ plans/ clinician/  # clinician: placeholders futuros
src/shared/                   # UI transversal, tema
src/theme/                    # Tokens (niveles, dashboards)
docs/                         # sensor-flow, calibración, Supabase
```

---

## Seguridad, privacidad y límites

- Los **avisos legales**, límites de uso, consentimiento y privacidad se concentran en el **documento legal** (PDF) accesible desde la app (aceptación inicial y Perfil).
- Las pantallas operativas muestran solo mensajes **funcionales** (sensor, calibración, práctica).
- **Consentimiento** digital antes de Terapia, Historial y sensor.
- Supabase en modo desarrollo: leer [docs/supabase-security-notes.md](docs/supabase-security-notes.md).

---

## Roadmap técnico (sugerido)

1. Pruebas de extremo a extremo (sensor → calibración → terapia → exportación).
2. Optimización de UI y copy clínico en flujos de paciente.
3. Integración clínica final y política de datos en nube.
4. Refinamiento de niveles 2–5 y dificultades.
5. Validación con usuarios y especialistas.
6. Documentación regulatoria (cuando aplique).

---

## Documentación adicional

- [Congelación de nube](README_CLOUD_FREEZE.md)
- [Seguridad Supabase (desarrollo)](docs/supabase-security-notes.md)
- [Arquitectura](src/docs/architecture.md)
- [Reparto por módulos](src/docs/team-ownership.md)

## Script `reset-project`

`npm run reset-project` proviene del template de Expo. **No ejecutarlo** sin leer `scripts/reset-project.js`.

## Aviso

RESPIRA+ es software en desarrollo para apoyo al ejercicio respiratorio. **No sustituye** valoración médica ni atención de urgencias.
