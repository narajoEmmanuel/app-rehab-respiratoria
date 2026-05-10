# Módulo `device` (sensor / ESP32)

Este módulo concentra el **transporte WebSocket**, la **ingestión de mensajes**, los **adaptadores de UI**, **mocks** de desarrollo, **componentes** de visualización y **pantallas** relacionadas con el hardware de distancia (ESP32 + VL53L0X). La app se construye con **Expo**, **React Native** y **TypeScript**; el firmware de referencia vive en el repo (`RESPIRA_WebSocket/`, `arduino_codes/`).

---

## Arquitectura de carpetas

| Carpeta | Rol |
|---------|-----|
| `websocket/` | Cliente WebSocket real (`Esp32WebSocketClient`) y artefactos de encaje histórico (`websocket-placeholder.ts`). |
| `ingestion/` | Parseo de payloads JSON del ESP32 hacia tipos seguros (`parseSensorMessage`, etc.). |
| `adapters/` | Hooks y piezas que unen transporte + estado con la UI (`useEsp32WebSocketSensor`, placeholders). |
| `mocks/` | Datos y lecturas simuladas para desarrollo sin hardware. |
| `components/` | UI reutilizable (p. ej. preview en vivo de distancia). |
| `screens/` | Pantallas del dominio dispositivo (p. ej. conexión integrada del sensor y estado). |
| `types/` | Contratos de lectura y estados de conexión. |

Las rutas de Expo Router en `app/` reexportan o componen estas piezas; la lógica de dominio del sensor debe seguir viviendo bajo `src/modules/device/`.

### Modo `offline_sensor_test` y rutas de dispositivo

El modo global **`offline_sensor_test`** (activable desde login cuando `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST=true`) significa **usar la app completa (tabs, terapia, niveles, historial) sin Supabase**: los repositorios consultan `shouldUseCloudData()` y en ese modo solo usan **AsyncStorage**. El paciente activo es un **paciente local de prueba** (`ensureOfflineSensorTestPatient`, clave `LOCAL_SENSOR_TEST`), separado de pacientes reales en nube.

| Ruta | Rol |
|------|-----|
| **`/sensor-connection`** | Pantalla **integrada** de conexión: estado del WebSocket, diagnóstico y vista previa basada en `distanceMm` (pipeline completo de la app). Accesible desde la app normal en modo offline. |
| **`/esp32-raw-test`** | Prueba **mínima de respaldo**: WebSocket directo al ESP32, sin el pipeline de ingestión de la app. |

**Pendientes:** calibración experimental, biofeedback experimental y niveles con sensor (requieren diseño y, donde aplique, `estimatedVolumeMl` y adaptador de entrada sensor → sesión).

---

## Flujo de datos (implementado)

Cadena principal cuando la app habla con el ESP32 en modo Access Point (WebSocket típico `ws://192.168.4.1:81`):

1. **ESP32** emite mensajes JSON por **WebSocket** (p. ej. `source`, `distanceMm`, `rawDistanceMm`, `distanceValid`, `timestamp`).
2. **`Esp32WebSocketClient`** (`websocket/esp32-websocket-client.ts`) abre el socket, recibe texto y delega el parseo en cada mensaje.
3. **`parseSensorMessage`** (`ingestion/parse-sensor-message.ts`) convierte el JSON crudo en un **`SensorReading`** tipado (tolera campos opcionales y rellena numéricos faltantes donde aplica).
4. **`useEsp32WebSocketSensor`** (`adapters/use-esp32-websocket-sensor.ts`) mantiene estado de conexión, URL, métricas básicas y alterna entre modo **mock** y **websocket** para la UI.
5. **`SensorConnectionScreen`** (`screens/SensorConnectionScreen.tsx`) orquesta la pantalla integrada de conexión y feedback.
6. **`SensorLivePreview`** (`components/SensorLivePreview.tsx`) muestra una **barra visual provisional** a partir de `distanceMm` (mapeo 0–100 % con rangos configurables; **no** es volumen espiratorio clínico).

Si `WebSocket` no está disponible en el entorno, el cliente notifica error sin bloquear el resto de la app.

### Diagnóstico en pantalla integrada (`SensorConnectionScreen`)

La pantalla **`/sensor-connection`** muestra un bloque de diagnóstico alineado con el hook **`useEsp32WebSocketSensor`**: `status`, `url`, `source`, `distanceMm`, `rawDistanceMm`, `distanceValid`, `timestamp`, `messageCount`, `messagesPerSecond`, vista previa de `lastRawMessage`, `errorMessage`, `closeCode`, `closeReason`, más el JSON del último `SensorReading` parseado. Incluye aviso visible de que los datos del sensor son **experimentales y no clínicos**.

Un mensaje que **no parsea** como `SensorReading` deja constancia en `errorMessage` pero **no** fuerza `status === 'error'` mientras el socket siga abierto, para no ocultar el estado conectado durante depuración; los fallos de **transporte** siguen marcando `error`.

---

## Cliente WebSocket

**Sí existe un cliente WebSocket real** en `websocket/esp32-websocket-client.ts`: encapsula conexión, desconexión, callbacks (`onOpen`, `onReading`, `onRawMessage`, errores y cierre) y usa `parseSensorMessage` para no propagar JSON inválido como lecturas.

Los **mocks** siguen siendo necesarios para desarrollo sin ESP32 y para el modo simulado en el hook.

---

## Calibración y límites actuales

- La **calibración experimental** del sensor (mapeo distancia → esfuerzo/volumen, compensaciones, etc.) está **pendiente de definición** y no debe documentarse como flujo cerrado.
- Cualquier calibración futura debe tratarse primero en **ámbito local / de laboratorio**; **no** integrarla a **Supabase**, historial clínico ni sesión real hasta que el hardware y el protocolo estén **estables** y el equipo lo apruebe explícitamente.

---

## Separación respecto a nube y sesión

El módulo **`device`** debe **permanecer acotado** respecto a:

- **Supabase** y persistencia en nube,
- **Historial** y métricas clínicas agregadas,
- **Sesión terapéutica** real (flujos de juego, guardado de avance, etc.),

hasta que el flujo de sensor esté **estable** y exista un diseño acordado de integración. En modo offline la app usa datos locales; **`/sensor-connection`** y **`/esp32-raw-test`** cubren integración y respaldo mínimo para el ESP32. Integrar lecturas del sensor con sesiones de terapia es trabajo **posterior** y deliberado.

---

## Entrada sin nube en desarrollo

La variable `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` (ver `.env.example`) permite en **desarrollo** el botón **«Entrar sin nube para probar con ESP32»** en login: pasa a **`offline_sensor_test`**, crea/carga el paciente local y entra a **`/(tabs)`** como la app completa, sin llamadas a Supabase (`shouldUseCloudData()` → false). La bandera en `offline-sensor-test.ts` sigue usándose para UX condicional (p. ej. banners en pantalla de sensor).

---

## Referencia rápida de tipos

Los campos relevantes del ESP32 en **`SensorReading`** incluyen `distanceMm`, `rawDistanceMm`, `distanceValid`, `timestamp` y `source`. Otros campos del tipo pueden venir a **cero** o por defecto si el firmware solo envía el subconjunto “raw_sensor”. **No** se expone en el contrato actual un campo dedicado `estimatedVolumeMl`.
