# Firmware ESP32

## Propósito

Referencia del firmware de producción que alimenta el WebSocket: ESP32 + VL53L0X, streaming controlado por botón, sin cálculo de volumen clínico en dispositivo.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Sketch principal | `arduino_codes/envio_datos_stream_button/envio_datos_stream_button.ino` |
| Libs vendoreadas | `libraries/Adafruit_VL53L0X/`, `libraries/WebSockets/`, etc. |
| Test HTML | Referenciado en `src/modules/device/calibration/README.md` (cliente JS en firmware) |

## Flujo técnico

1. ESP32 crea AP `RESPIRA_ESP32` (`192.168.4.1/24`).
2. HTTP puerto 80 — página diagnóstico.
3. WebSocket puerto **81** — broadcast JSON periódico.
4. VL53L0X I2C (`0x29`), pines SDA 21 / SCL 22 (sketch de referencia).
5. Botón GPIO25 inicia/para streaming; LED GPIO26 indicador.
6. Intervalos sketch: lectura sensor ~50 ms, envío WS ~100 ms.

## Datos de entrada

- Medición ToF VL53L0X → distancia mm.
- Estado botón / streaming activo.

## Datos de salida (JSON)

Distancia y metadatos; **volumen clínico en 0** en firmware (app calcula mL).

Campos alineados con `parse-sensor-message.ts`: `distanceMm`, `rawDistanceMm`, `distanceValid`, `source`, timestamps, etc.

## Relación con la app

| Aspecto | Firmware | App |
|---------|----------|-----|
| Volumen mL | No clínico / stub | `volume-estimation-service` |
| Presión | No soportado | Fuera de alcance |
| Sesión oficial | Provee distancia viva | Valida + persiste |
| Touch practice | N/A | Simulación sin ESP32 |

## Riesgos

- Cambiar JSON sin actualizar `parse-sensor-message.ts` rompe estimación.
- Contraseña AP hardcoded en sketch — solo entorno controlado.

## Pendientes o revisión manual

- Versión firmware reportada en JSON vs campo reservado `firmware_version` en export clínico.
- Validar pines/botón en hardware físico del equipo.

## Checklist manual mínimo

- [ ] AP visible; teléfono obtiene IP 192.168.4.x.
- [ ] WS :81 entrega JSON con `distanceMm`.
- [ ] Streaming solo con botón presionado (sketch actual).
- [ ] App termómetro responde al movimiento del pistón.

## Docs relacionados

- [WebSocket protocol](./websocket-protocol.md)
- [Hardware lab](./hardware-lab.md)
