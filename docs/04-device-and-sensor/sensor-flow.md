# Flujo del sensor

## Propósito

Describir el recorrido técnico **conexión ESP32 → lectura de distancia → volumen estimado → terapia/evaluación → historial/export**, con un único WebSocket global.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Provider global | `src/modules/device/state/SensorConnectionProvider.tsx` |
| Pantalla conexión | `src/modules/device/screens/SensorConnectionScreen.tsx` |
| Cliente WS | `src/modules/device/websocket/esp32-websocket-client.ts` |
| Adapter hook | `src/modules/device/adapters/use-esp32-websocket-sensor.ts` |
| Parseo | `src/modules/device/ingestion/parse-sensor-message.ts` |
| Tipos | `src/modules/device/types/sensor-reading.ts` |
| Stream state | `src/modules/device/stream/sensor-stream-state.ts` |
| Volumen vivo | `src/modules/device/volume-estimation/use-active-volume-estimate.ts` |
| Readiness terapia | `src/modules/device/volume-estimation/therapy-readiness-service.ts` |
| UI termómetro | `src/modules/device/components/VolumeThermometer.tsx` |
| Ruta | `app/sensor-connection.tsx` |

## Flujo técnico

```mermaid
flowchart LR
  ESP[ESP32 AP RESPIRA_ESP32] --> WS[ws://192.168.4.1:81]
  WS --> Parse[parseSensorMessage]
  Parse --> Provider[SensorConnectionProvider]
  Provider --> Vol[volume-estimation-service]
  Vol --> UI[VolumeThermometer / LiveVolumeCard]
  Vol --> Session[SessionScreen / DiagnosticExam]
  Session --> Store[@rehab/sessions_v1]
```

1. Usuario se conecta al AP `RESPIRA_ESP32` (contraseña en firmware: `respira123` en sketch de referencia).
2. App abre WebSocket `ws://192.168.4.1:81` (`DEFAULT_WS_URL` en `use-esp32-websocket-sensor.ts`).
3. JSON → `SensorReading` con `distanceMm`, `rawDistanceMm`, `distanceValid`.
4. Modelo calibración RESPIRA+ 3000 mL → **volumen inspirado estimado** (clamp 0–3000 mL).
5. Terapia/evaluación exigen señal viva; lecturas obsoletas bloqueadas (`isSensorStreamActivelyReceiving`).
6. Práctica táctil **no consume** este flujo para validación oficial.

## Datos y persistencia

| Entrada | Salida |
|---------|--------|
| Payload JSON firmware | `SensorReading` normalizado |
| `distanceMm` | `volumeMl` estimado vía calibración activa |
| Metadatos (`firmwareVersion`, `deviceId`, `sensorStatus`, `filter`) | Trazabilidad en sesión/intento al persistir |

No persiste stream crudo en AsyncStorage; solo agregados de sesión.

## Riesgos

- Confundir volumen UI con medición clínica certificada.
- Mostrar último volumen sin señal viva (mitigado en terapia).
- Segundo cliente WebSocket duplicaría estado — prohibido por diseño.

## Pendientes o revisión manual

- Comportamiento exacto si `distanceValid === false` en cada pantalla — validar en dispositivo.
- Doc legacy en `docs/sensor-flow.md` (raíz): mantener alineada con export v2.4.0 y flujo paciente.

## Checklist manual mínimo

- [ ] Conectar AP → WS connected → termómetro actualiza mL.
- [ ] Cortar stream: terapia bloquea lecturas obsoletas.
- [ ] Sin calibración instalada: readiness falla hasta `ensureRespira3000PredefinedCalibrationInstalled`.
- [ ] Touch practice: sesión no requiere WS conectado.
- [ ] Export incluye trazabilidad sensor en sesiones oficiales.

## Docs relacionados

- [WebSocket protocol](./websocket-protocol.md)
- [Calibración](../05-calibration/patient-flow.md)
- [Sesión oficial](../03-features/sesion-terapia.md)
