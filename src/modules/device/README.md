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
| `screens/` | Pantallas del dominio dispositivo (p. ej. conexión, **Hardware Lab** y estado). |
| `types/` | Contratos de lectura y estados de conexión. |

Las rutas de Expo Router en `app/` reexportan o componen estas piezas; la lógica de dominio del sensor debe seguir viviendo bajo `src/modules/device/`.

### Rutas de desarrollo y Hardware Lab

| Ruta | Rol |
|------|-----|
| **`/hardware-lab`** | Panel de **desarrollo** (`HardwareLabScreen`): agrupa enlaces a pruebas de hardware cuando `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` está activo en desarrollo. No sustituye flujo clínico ni nube. |
| **`/esp32-raw-test`** | Prueba **mínima de respaldo**: WebSocket directo al ESP32, sin el pipeline de ingestión de la app. |
| **`/sensor-connection`** | Pantalla **integrada**: conexión, estado y vista previa basada en `distanceMm` (cliente WebSocket + `parseSensorMessage` + UI). |

**Pendientes (sin ruta aún):** calibración experimental y biofeedback experimental; el Hardware Lab muestra tarjetas deshabilitadas como marcadores de fase.

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

hasta que el flujo de sensor esté **estable** y exista un diseño acordado de integración. Hoy la conexión real se valida desde **`/hardware-lab`** (hub), **`/esp32-raw-test`** (respaldo mínimo) y **`/sensor-connection`** (integrada); enlazar eso con terapia e historial es trabajo **posterior** y deliberado.

---

## Prueba offline en desarrollo

La variable `EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST` (ver `.env.example` en la raíz del repo) activa en **desarrollo** un camino de prueba de sensor sin hardware, según `offline-sensor-test.ts`. Esto **no** equivale al modo producto **offline_sensor_test** global descrito en el README principal; sirve para no bloquear el desarrollo de UI mientras se formaliza el producto.

---

## Referencia rápida de tipos

Los campos relevantes del ESP32 en **`SensorReading`** incluyen `distanceMm`, `rawDistanceMm`, `distanceValid`, `timestamp` y `source`. Otros campos del tipo pueden venir a **cero** o por defecto si el firmware solo envía el subconjunto “raw_sensor”. **No** se expone en el contrato actual un campo dedicado `estimatedVolumeMl`.
