# RESPIRA+ | Sistema de calibración, adquisición sensórica y estimación de volumen

Documentación técnica del **módulo de calibración local** (ESP32 + VL53L0X ↔ app Expo/React Native). Describe el flujo de datos, el protocolo de medición en pantalla, los criterios de calidad, las ecuaciones implementadas y el firmware de referencia. **No sustituye validación clínica ni instrucciones del fabricante del espirómetro.**

---

## 0. Estado actual — flujo paciente (2026)

| Aspecto | Valor activo |
|---------|--------------|
| Espirómetro | **RESPIRA+ 3000 mL** (único perfil en UI paciente) |
| Calibración de banco | **30 de mayo de 2026** (`cal-predefined-respira-3000-v20260530`) |
| Modelo predeterminado | Lineal: `Volumen = 26.11855011086812 × distanceMm − 1194.3556609431557` |
| Clamp | 0–3000 mL (< 0 → 0 mL; > 3000 → 3000 mL) |
| Cálculo de volumen | **En la app** a partir de `distanceMm`; el ESP32 no envía volumen clínico |
| Calibración técnica UI | Oculta (`EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false`) |
| Export técnico (U95, R², CSV) | Solo modo técnico/debug |
| UI conexión | Termómetro visual 0–3000 mL (`VolumeThermometer`) |
| Firmware de referencia | `arduino_codes/envio_datos_stream_button/envio_datos_stream_button.ino` |
| Hardware | ESP32 WROOM 32 DevKit V1 + VL53L0X (GY-530) |

### Legacy (conservado en código, no activo en paciente)

- Perfil **5000 mL** (Besmed CIYO/TB-93500): calibración multi-volumen, validación geométrica y constantes en `calibration-constants.ts`.
- Opción **«Otro»** espirómetro: eliminada del flujo paciente.
- Ecuación lineal anterior de banco (`32.566738… × distanceMm − 1270.5786…`): referencia histórica; **no** es la ecuación activa de la app.
- Firmware `envio_datos_prueba2.ino`: variante histórica con JSON enriquecido; ver sección 4 para detalle legacy.

Las secciones siguientes documentan el **sistema completo** incluyendo calibración técnica y perfiles legacy. Donvergencia con el flujo paciente actual, prevalece la sección 0.

---

## 1. Propósito del sistema de calibración

### 1.1 Qué se calibra

El sistema relaciona la **distancia medida por el sensor ToF VL53L0X** (posición del pistón o elemento móvil del montaje) con el **volumen marcado en el espirómetro incentivador volumétrico** (referencia en mL). Esa relación se materializa en un **perfil de calibración** (`CalibrationProfile`) y en uno o más **modelos** (`CalibrationModel`) que convierten `distanceMm` → `estimatedVolumeMl`.

### 1.2 Por qué hace falta el espirómetro real

El sensor solo ve **milímetros de desplazamiento**. El volumen clínico útil depende de la **geometría del cilindro**, del **montaje del sensor** y de la **orientación** respecto al pistón. En **flujo paciente**, la app usa el modelo lineal predeterminado RESPIRA+ 3000 mL validado por el equipo. En **calibración técnica** (modo técnico), se registran puntos con el volumen real indicado por el espirómetro — incluyendo el perfil legacy Besmed CIYO/TB-93500 (**5000 mL**, constantes en `calibration-constants.ts`).

### 1.3 De mm a mL

Tras registrar pares (volumen objetivo en mL, distancia media en mm) por varios niveles, la app:

1. Agrega estadísticamente las capturas por volumen (`VolumeCalibrationSummary`).
2. Ajusta o interpola una función **distancia → volumen** (regresión lineal o lineal por tramos).
3. En tiempo real, aplica esa función a `distanceMm` para obtener **`estimatedVolumeMl`** (con reglas de rango y *clamp* según el tipo de modelo).

### 1.4 Relevancia para juego, retroalimentación y seguridad del desempeño

Una calibración coherente reduce **sesgo sistemático** en la estimación de volumen inspirado, estabiliza la **retroalimentación** (objetivos, barras, mensajes) y evita que el usuario entrene con **lecturas desalineadas** respecto al dispositivo de referencia. Los umbrales de “listo para terapia” en código son **criterios técnicos de producto**, no certificación médica.

### 1.5 Validación clínica pendiente

En la UI y en tipos/comentarios del código se deja explícito que la estimación es **experimental** (`isExperimental: true`) y **pendiente de validación clínica** antes de un uso terapéutico formal. Esta documentación **no** afirma equivalencia metrológica con un espirómetro homologado para diagnóstico.

---

## 2. Contexto clínico y técnico (alcance del producto)

- **RESPIRA+** se orienta a **ejercicios respiratorios postoperatorios** con **espirómetro incentivador volumétrico**.
- Variables de interés en el ecosistema de la app incluyen, entre otras: **volumen inspirado estimado**, **tiempo sostenido**, **repeticiones válidas**, **cumplimiento** y **progreso** (según módulos de terapia y juego; **esta documentación no los modifica**).
- El canal `raw_sensor` del ESP32 puede incluir campos de flujo/volumen simulados a cero; la **app ignora esos stubs** y calcula volumen a partir de **`distanceMm`**, **`rawDistanceMm`** y **`distanceValid`**.
- **No** se mide presión inspiratoria en este pipeline de calibración.
- El **volumen es indirecto**: se infiere del **desplazamiento** observado por el ToF, no de un medidor de volumen integrado en el teléfono.

---

## 3. Arquitectura general

### 3.1 Flujo textual

```
ESP32 + VL53L0X (I2C)
  → lectura cruda + filtro → distanceMm / rawDistanceMm / distanceValid
  → WebSocketsServer (puerto 81) JSON texto
  → Esp32WebSocketClient.onmessage
  → parseSensorMessage → SensorReading
  → useEsp32WebSocketSensor (estado de conexión, última lectura, métricas)
  → SensorConnectionProvider (contexto React compartido)
  → SensorCalibrationScreen (buffer, captura, informes, persistencia)
  → buildCalibrationProfile → CalibrationProfile (AsyncStorage opcional)
  → buildLinearCalibrationModel / buildPiecewiseLinearCalibrationModel
  → recommendCalibrationModel
  → estimateVolumeFromDistance → estimatedVolumeMl
```

### 3.2 Rol de los archivos citados

| Componente | Archivo | Función |
|------------|---------|---------|
| Constantes de protocolo y tolerancias | `calibration-constants.ts` | Umbrales mL/mm, repeticiones mínimas, segmentos geométricos, chips de volumen. |
| Tipos de perfil y puntos | `calibration-types.ts` | `CalibrationCapturePoint`, `CalibrationProfile`, `VolumeDistanceRelation`, versión de esquema. |
| Matemática agregada | `calibration-math.ts` | Summaries, cobertura, protocolo obligatorio, geometría, repetibilidad, segmentos, `buildCalibrationProfile`. |
| Persistencia | `calibration-storage.ts` | AsyncStorage `@respira_device_calibration_profile_v1`, carga/guardado/borrado. |
| Tipos de modelo | `calibration-model-types.ts` | `CalibrationModel`, métricas, umbrales `LINEAR_ACCEPTABLE_THRESHOLDS`, recomendación. |
| Métricas de error | `calibration-model-evaluation.ts` | R², RMSE, MAE, error máximo absoluto (mL). |
| Modelo y estimación | `calibration-model.ts` | Ajuste lineal, piecewise, `recommendCalibrationModel`, `estimateVolumeFromDistance`. |
| API pública del módulo | `index.ts` | Reexportaciones. |
| Pantalla de calibración | `SensorCalibrationScreen.tsx` | Conexión compartida, buffer temporal, registro de puntos, tablas e informes. |
| Pantalla de conexión | `SensorConnectionScreen.tsx` | Conexión, termómetro de volumen (`VolumeThermometer`), estado de señal. |
| Estado global del sensor | `SensorConnectionProvider.tsx` | Instancia única de `useEsp32WebSocketSensor`. |
| Hook sensor | `use-esp32-websocket-sensor.ts` | URL por defecto `ws://192.168.4.1:81`, mock, timeouts, mensajes/s. |
| Cliente WS | `esp32-websocket-client.ts` | `WebSocket` nativo, delega parseo a `parseSensorMessage`. |
| Parseo | `parse-sensor-message.ts` | JSON → `SensorReading`, tolerancia a campos faltantes. |
| Tipos de lectura | `sensor-reading.ts` | `SensorReading`, `SensorConnectionStatus`, `SensorSource`. |
| Modelo predeterminado | `predefined-calibration-models.ts` | Ecuación lineal RESPIRA+ 3000 mL, clamp 0–3000. |
| Firmware (referencia) | `arduino_codes/envio_datos_stream_button/envio_datos_stream_button.ino` | AP WiFi, HTTP 80, WebSocket 81, VL53L0X, streaming por botón. |
| Firmware (legacy) | `arduino_codes/envio_datos_prueba2/envio_datos_prueba2.ino` | Variante histórica con JSON enriquecido. |

---

## 4. Adquisición en ESP32

### 4.0 Firmware de referencia (`envio_datos_stream_button.ino`)

Firmware activo de producción: streaming por botón GPIO26, AP `RESPIRA_ESP32`, WebSocket puerto 81. El JSON envía **`distanceMm`**, **`rawDistanceMm`**, **`distanceValid`** y campos stub de volumen/flujo a cero. **La app calcula el volumen clínico**; el firmware no lo determina.

### 4.1 Variante legacy (`envio_datos_prueba2.ino`)

Documentación histórica del pipeline de adquisición. Misma topología AP/WS; JSON con metrología adicional (`deviceId`, `firmwareVersion`, etc.). Ver auditoría en `docs/AUDITORIA-TECNICA-SENSOR-ESP32.md`.

- `WiFi.h` — modo **Access Point**.
- `WebServer.h` — HTTP en puerto **80** (página de diagnóstico en `/`).
- `WebSocketsServer.h` — WebSocket en puerto **81**.
- `Wire.h` — bus **I2C**.
- `Adafruit_VL53L0X.h` — driver del VL53L0X.

### 4.2 Librerías y stack (legacy `envio_datos_prueba2.ino`)

- **SDA**: GPIO **21**  
- **SCL**: GPIO **22**  
- `Wire.begin(21, 22)` y `Wire.setClock(100000)` → **100 kHz** I2C.

### 4.3 Inicialización del VL53L0X

- `lox.begin()`; si falla, el firmware entra en un **bucle infinito** con mensaje de error por Serial (no hay envío útil de distancia).

### 4.4 Frecuencias

| Etapa | Constante | Valor | Interpretación |
|--------|-----------|-------|----------------|
| Lectura del sensor | `SENSOR_READ_INTERVAL_MS` | 50 ms | ~**20** lecturas/s en `readVl53l0xSensor()` |
| Envío WebSocket | `WS_SEND_INTERVAL_MS` | 100 ms | ~**10** mensajes/s broadcast |
| Log Serial estado | `STATUS_INTERVAL_MS` | 5000 ms | Telemetría por puerto serie |

### 4.5 `rawDistanceMm` y `distanceMm`

- Tras `lox.rangingTest(&measure, false)`:
  - Si **`measure.RangeStatus != 4`**: lectura válida según el criterio del ejemplo Adafruit.
    - `rawDistanceMm = measure.RangeMilliMeter` (entero, mm).
    - Filtro exponencial: `filteredDistance = FILTER_ALPHA * raw + (1 - FILTER_ALPHA) * filteredDistance` con **`FILTER_ALPHA = 0.35`**.
    - `distanceMm = (int)(filteredDistance + 0.5)` → **redondeo** al entero más cercano.
  - Si **`RangeStatus == 4`**:
    - `rawDistanceMm = -1`, `distanceValid = false` (no se actualiza el filtro con un valor inválido en esa rama).

### 4.6 `distanceValid`

- `true` cuando el rango no está en el estado de fallo **4**; `false` en caso contrario o antes de una lectura válida inicial.

### 4.7 WiFi Access Point

- SSID: **`RESPIRA_ESP32`**
- Contraseña: **`respira123`**
- `WiFi.mode(WIFI_AP)` + `WiFi.softAPConfig(192.168.4.1, 192.168.4.1, 255.255.255.0)` + `WiFi.softAP(...)`.
- IP del ESP32 en la red del AP: **192.168.4.1**.

### 4.8 HTTP y WebSocket

- **HTTP**: `http://192.168.4.1/` → página HTML de diagnóstico (incluye cliente JS que abre **`ws://192.168.4.1:81`**).
- **WebSocket**: **`ws://192.168.4.1:81`** — `WebSocketsServer webSocket(81);`, `webSocket.begin()`, `broadcastTXT` en el envío periódico.

### 4.9 Estructura exacta del JSON enviado

El firmware construye una sola línea JSON con `snprintf` (campos fijos + valores en tiempo de ejecución):

```json
{
  "source": "raw_sensor",
  "volumeMl": 0,
  "sustainedTimeMs": 0,
  "validRepetitions": 0,
  "distanceMm": 84,
  "rawDistanceMm": 84,
  "distanceValid": true,
  "flowState": "idle",
  "isValidAttempt": false,
  "timestamp": 123456
}
```

Notas:

- `source` es la cadena literal `"raw_sensor"`.
- `volumeMl`, `sustainedTimeMs`, `validRepetitions` están en **0** en este *sketch* (placeholders compatibles con la app).
- `flowState` es `"idle"`; `isValidAttempt` es **`false`** en C se serializa como `false`.
- **`timestamp`** es **`millis()`** del ESP32 (ms desde el arranque del microcontrolador), **no** epoch Unix — la app puede sustituir por `Date.now()` solo si el campo llega inválido (`parseSensorMessage` usa `Date.now()` si `timestamp` no es número finito).

---

## 5. Capa de transporte y parseo en la app

### 5.1 `Esp32WebSocketClient`

- Crea `new WebSocket(url)`.
- En cada mensaje de texto: notifica `onRawMessage`, luego **`parseSensorMessage(event.data)`**; si es `null`, `onParseError` pero **no** se cierra la conexión.

### 5.2 `parseSensorMessage`

- Acepta **string JSON** u **objeto**.
- `volumeMl`, `sustainedTimeMs`, `validRepetitions`: numéricos finitos o **0** por defecto.
- `distanceMm` / `rawDistanceMm`: opcionales; solo se fijan si son finitos.
- `distanceValid`: opcional booleano.
- `flowState`: debe ser uno de `idle` | `inhaling` | `holding` | `exhaling`; si no, **`idle`**.
- `source`: string no vacío o **`websocket`** por defecto.
- `timestamp`: número finito del payload o **`Date.now()`**.

### 5.3 `useEsp32WebSocketSensor`

- URL inicial: **`ws://192.168.4.1:81`**.
- Tras **9 s** en estado `connecting` sin completar el handshake → desconexión y **`error`** con mensaje de timeout.
- Ventana **5 s** para calcular **mensajes/s** aproximados.
- Modo **mock**: intervalo **900 ms** (`MOCK_INTERVAL_MS`), datos de `getMockSensorReading` (no documentados aquí en detalle).

### 5.4 `SensorConnectionProvider`

- Expone el valor del hook a todo el árbol envuelto; `useSensorConnection()` falla si se usa fuera del provider.

---

## 6. Protocolo de medición en `SensorCalibrationScreen`

### 6.1 Buffer temporal y estabilidad

Constantes locales de pantalla (no en `calibration-constants.ts`):

| Parámetro | Valor | Significado |
|-----------|-------|-------------|
| `BUFFER_MAX_SAMPLES` | 20 | Máximo de muestras en ventana. |
| `BUFFER_WINDOW_MS` | 2000 ms | Muestras con `receivedAt` dentro de los últimos 2 s. |
| `MIN_SAMPLES_TO_REGISTER` | 5 | Mínimo de muestras para permitir “Registrar punto”. |
| `STABILITY_VARIABLE_STD_MM` | 5 mm | Umbral UI “variable”. |
| `STABILITY_STABLE_STD_MM` | 2.5 mm | Umbral UI “estable”. |

Para cada lectura válida del sensor se añade al buffer `{ distanceMm, rawDistanceMm, timestamp, source, receivedAt }`. Las estadísticas del buffer (`computeBufferStats`):

- Media aritmética de `distanceMm` y `rawDistanceMm`.
- Mín/máx de `distanceMm`.
- **Desviación estándar** de `distanceMm`: raíz de la varianza **muestral con divisor `n`** (σ de población sobre el buffer, no \(n-1\)).

Clasificación **SignalStability**: `insufficient` | `stable` | `acceptable` | `variable` según `sampleCount` y `stdDistanceMm`.

### 6.2 Condiciones para registrar un punto (`canRegister`)

Se exige simultáneamente:

1. **Modo en vivo**: estado `connected` o `receiving`, o `mode === 'mock'`.
2. **Volumen válido**: número ≥ 0 parseado del campo de texto.
3. **`liveSignalOk`**: `distanceValid === true` y `distanceMm` finito.
4. **`distanceMm >= MIN_RELIABLE_SENSOR_DISTANCE_MM`** (**30 mm**, constante de módulo).
5. **`bufferStats.sampleCount >= MIN_SAMPLES_TO_REGISTER`** (5).
6. Reglas de **modo repetición** de volumen (borrador de 5 mediciones, mismo volumen, etc.).

Cada **`CalibrationCapturePoint`** guarda, entre otros: `volumeMl`, `distanceMm` y `rawDistanceMm` como **medias del buffer**, `stdDistanceMm`, `minSampleDistanceMm`, `maxSampleDistanceMm`, `sampleCount`, `repetitionNumber`, `distanceValid: true`, `source`, `timestamp` del buffer.

### 6.3 Protocolo mínimo “terapia” (constantes compartidas)

Definido en `computeRequiredCalibrationCoverage` + `recommendCalibrationModel`:

- Volúmenes obligatorios: **`REQUIRED_RECOMMENDED_VOLUMES_ML`** = **500, 1000, 1500, 2000, 2500, 3000** mL.
- **`MIN_REPETITIONS_PER_REQUIRED_VOLUME` = 5** mediciones por cada volumen obligatorio (conteo por **summaries**, no solo puntos con `distanceValid` en historial antiguo — los puntos nuevos se guardan con `distanceValid: true`).
- **`MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY` = 30** puntos válidos en total donde válido = volumen en obligatorios **y** `distanceValid === true`.

Advertencia técnica adicional: **`MIN_REPETITIONS_PER_VOLUME` = 3** — volúmenes con menos de 3 repeticiones generan aviso en el informe de repetibilidad.

### 6.4 Relación volumen–distancia

`determineVolumeDistanceRelation`:

- Ordena summaries por `volumeMl`.
- Compara **medias** consecutivas de `avgDistanceMm`.
- **`direct`**: todas las diferencias **> 0**.
- **`inverse`**: todas **< 0**.
- **`indeterminate`**: mezcla o empates — **bloquea** modelo lineal monotónico y afecta la recomendación.

---

## 7. Validación geométrica (montaje vs espirómetro)

Referencia física en código: **`EXPECTED_DISTANCE_STEP_PER_500ML_MM = 10`** mm por cada **`EXPECTED_VOLUME_STEP_ML = 500`** mL (comentario metrológico: verificación física aproximada ~1 cm / 500 mL).

Segmentos obligatorios **`REQUIRED_GEOMETRIC_SEGMENTS_ML`**: (500→1000), (1000→1500), …, (2500→3000).

Para cada tramo se calcula **Δ medido** = `avgDistanceMm(to) - avgDistanceMm(from)` y se compara con **Δ esperado** = **+10 mm** (montaje directo) o **−10 mm** (inverso).

Estados por tramo (`GeometricScaleSegmentStatus`):

- **`ok`**: error absoluto **≤ `GEOMETRIC_STEP_OK_TOLERANCE_MM`** (2 mm).
- **`review`**: error **≤ `GEOMETRIC_STEP_REVIEW_TOLERANCE_MM`** (4 mm) pero > 2 mm.
- **`critical`**: fuera de 4 mm, signo incorrecto respecto a la relación, o sin variación donde no aplica.
- **`missing`**: faltan summaries en alguno de los volúmenes del tramo.

**`passesGeometricValidation`**: verdadero solo si **todos** los tramos están en **`ok`**.

---

## 8. Repetibilidad y segmentos

### 8.1 Repetibilidad entre repeticiones

`computePerVolumeRepeatability` usa **desviación estándar muestral** (\(n-1\)) de los `distanceMm` por volumen.

Clasificación por **`sdBetweenRepetitionsMm`** (en `classifySdBetweenRepetitions`):

- **≤ 3 mm**: `warningLevel = ok`, `needsRetake = false`.
- **≤ 5 mm**: `moderate`, no exige retoma automática.
- **> 5 mm**: `high`, **`needsRetake = true`** (la UI puede ofrecer “Repetir volumen”).

Informe global (`computeRepeatabilityReport`):

- **`maxStdDistanceMm`** de los **`stdDistanceMm`** almacenados en cada punto (dispersión **intra-captura** del buffer).
- Advertencia si **`maxStdDistanceMm > MAX_ACCEPTABLE_STD_DISTANCE_MM`** (**5 mm**).

### 8.2 Segmentos consecutivos y variación de pendiente

`computeSegmentReport` recorre summaries ordenados por volumen:

- \(\Delta V\) = `volumeTo - volumeFrom` (mL).
- \(\Delta d\) = `avgDistanceMm(to) - avgDistanceMm(from)` (mm).
- **`slopeMlPerMm`** = \(\Delta V / \Delta d\) si \(\Delta d \neq 0\); si no, `null`.

Advertencias por saltos no monotónicos según `relation`, o si **|\(\Delta d\)| < `MIN_SEGMENT_DISTANCE_DELTA_MM`** (1 mm).

**`slopeVariationRatio`** = `max(|slope|) / min(|slope|)` sobre segmentos definidos. Si **> `MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO`** (**2.5**), se añade advertencia de saltos bruscos. Este ratio entra también en **`isReadyForTherapy`** (bloqueo si es crítico).

---

## 9. Modelos matemáticos implementados

### 9.1 Datos de entrada del ajuste

Ambos modelos usan **`VolumeCalibrationSummary`**: un punto por **volumen distinto** con **`avgDistanceMm`** y **`volumeMl`** (promedios por nivel, no crudo muestra a muestra).

### 9.2 Regresión lineal (`linear_regression`)

**Mínimos cuadrados** de \(y = a x + b\) con:

- \(x_i\) = `avgDistanceMm`  
- \(y_i\) = `volumeMl`  

Coeficientes:

\[
a = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2}, \quad b = \bar{y} - a\bar{x}
\]

**Estimación**: `estimatedVolumeMl = slope * distanceMm + intercept` con **clamp** al rango **[min(volumeMl), max(volumeMl)]** de los summaries; bandera **`clamped`**. **`inRange`**: si `distanceMm` está entre `distanceRangeMm.min` y `distanceRangeMm.max`.

**Estados del modelo** (`CalibrationModelStatus`): `valid`, `insufficient_data` (< 2 volúmenes), `non_monotonic` (relación indeterminada), `invalid_range` (rango de distancia **< `MIN_USEFUL_DISTANCE_RANGE_MM`** = 5 mm, o ajuste degenerado). El tipo incluye **`high_error`** pero el constructor actual no lo asigna en las ramas revisadas.

**Métricas de calidad** (sobre los mismos puntos de ajuste): **R²**, **RMSE**, **MAE**, **error máximo absoluto** (todos en **mL** salvo R² adimensional). Ver `calibration-model-evaluation.ts`.

**Lineal “aceptable”** (`LINEAR_ACCEPTABLE_THRESHOLDS`):  
R² ≥ **0.95**, RMSE ≤ **250** mL, MAE ≤ **200** mL, error máx ≤ **500** mL.

**Advertencias** (`MODEL_WARNING_THRESHOLDS`): mismos valores que disparan *warnings* aunque el status siga siendo `valid`.

### 9.3 Lineal por tramos (`piecewise_linear`)

- Ordena summaries por **`avgDistanceMm`** ascendente.
- Entre dos puntos consecutivos en distancia: interpolación lineal en volumen:

\[
V(d) = V_L + \frac{d - d_L}{d_R - d_L}(V_R - V_L)
\]

- Si \(d\) está fuera del intervalo \([d_{\min}, d_{\max}]\), se devuelve el volumen del **extremo** más cercano y **`clamped: true`**.
- Requiere **`CalibrationProfile`** pasado a **`estimateVolumeFromDistance`** cuando el modelo es piecewise (el código lo exige explícitamente).

**Métricas**: se evalúan predicciones sobre los `xs` ordenados; en datos sin distancias duplicadas la predicción en nodos coincide con los volúmenes (residuos ~0 salvo casos degenerados).

### 9.4 `recommendCalibrationModel` (resumen de reglas)

Orden conceptual:

1. **< 2 volúmenes distintos** → `recommendedKind: none`, `needs_more_points`.
2. **Relación indeterminada** → `none`, `needs_recalibration`.
3. **Rango de distancia < 5 mm** → `none`, `invalid`.
4. Si **cubre 500–3000 mL** (`coversRecommended`):
   - Si **≥ 4** volúmenes distintos y piecewise válido → **`piecewise_linear`** (preferido).
   - Si no, pero lineal aceptable → **`linear_regression`**.
   - Si no hay modelo fiable → **`none`**.
5. Si **no cubre** el rango recomendado → `limited_range`; puede aún estimar en rango parcial con piecewise o lineal según disponibilidad y calidad.

**`isReadyForTherapy`** exige, además del bloque anterior: protocolo mínimo cumplido, **`coversRecommended`**, relación no indeterminada, spread de distancias ≥ 5 mm, modelo recomendado no `none`, **`maxStdDistanceMm ≤ 5`**, **`slopeVariationRatio ≤ 2.5`** (si aplica), sin volúmenes con **`needsRetake`**, y **`passesGeometricValidation`**.

---

## 10. Unidades y variables clave

| Símbolo / campo | Unidad | Origen |
|-----------------|--------|--------|
| `distanceMm`, `rawDistanceMm` | mm | ESP32 / buffer / punto |
| `volumeMl` (objetivo de calibración) | mL | Usuario / espirómetro |
| `estimatedVolumeMl` | mL | Modelo |
| `stdDistanceMm` (punto) | mm | Buffer al registrar |
| `sdBetweenRepetitionsMm` | mm | Entre repeticiones mismo volumen |
| `slope` (lineal) | mL/mm | Regresión |
| `intercept` | mL | Regresión |
| `slopeMlPerMm` (segmento) | mL/mm | \(\Delta V/\Delta d\) |
| `timestamp` (ESP32) | ms (`millis`) | Firmware |
| `timestamp` / `createdAt` (app) | ms epoch | JS `Date.now()` |

---

## 11. Persistencia local

- **Clave AsyncStorage**: `@respira_device_calibration_profile_v1` (`CALIBRATION_STORAGE_KEY`).
- **Versión de esquema**: `CALIBRATION_PROFILE_VERSION = 1`.
- Validación mínima en carga: `id`, `name`, `createdAt`, `updatedAt`, `points[]`, `summaries[]`, `globalRange`, `source === 'local_calibration'`, `isExperimental === true`, `version` numérico.

---

## 12. Tablas y bloques principales en la UI (`SensorCalibrationScreen`)

Resumen de **secciones** y columnas tal como están en código:

| Sección | Contenido |
|---------|-----------|
| **Cabecera / héroe** | Estado de conexión, contador de puntos, pastillas “Señal válida”, modo real/simulado, estabilidad. |
| **Lectura en vivo** | Estado, Distance (mm), Raw (mm), Señal, Muestras buffer, Variación (std) mm. |
| **Conexión del sensor** | URL compartida (solo lectura desde calibración), conectar, limpiar, desconectar, debug mock. |
| **Estabilidad de medición** | Promedio distance, ±std, promedio raw, min/max, texto de ventana 2 s / máx 20 muestras. |
| **Volumen del espirómetro** | Input + chips 500–3000 y extendido 3500–5000, aviso &lt;500 mL, botón Registrar. |
| **Puntos capturados** | Por grupo de volumen: `Rep #n · distancia mm`, `n= muestras · ±std · rango mm`. |
| **Resumen por volumen** | Columnas: **Vol**, **Rep**, **Prom**, **Min-Max**. |
| **Protocolo mínimo** | Métricas de progreso, lista de mediciones por volumen obligatorio (Volumen / Mediciones). |
| **Validación geométrica** | Tabla horizontal: **Tramo**, **Δ medido**, **Δ esperado**, **Error %**, **Estado**. |
| **Modelo recomendado** | Estimación en rango, listo terapia, modelo seleccionado, calidad, razones y *warnings*. |
| **Calidad del modelo lineal** | Ecuación mostrada como `estimatedVolumeMl = slope · distanceMm ± intercept`, R², RMSE, MAE, error máximo, rango distancia. |
| **Cobertura** | Rango calibrado mL, rango útil mm, % 500–3000 y 500–5000, textos de cobertura total/recomendada. |
| **Repetibilidad** | Grid resumen + tabla **Volumen, n, Promedio, SD rep., Rango, Estado, Acción** (Repetir volumen si `high`). |
| **Segmentos** | Pendientes min/máx, variación ×, tabla **Tramo (mL), Δ dist., Pendiente**. |
| **Persistencia local** | Guardar / cargar / borrar / reiniciar puntos en pantalla. |

`SensorConnectionScreen` muestra estado de conexión, métricas de mensajes y enlaces a calibración; el *badge* “Dispositivo listo” combina **señal válida** + **`useCalibrationSnapshot`** con perfil guardado (`kind === 'ready'`).

---

## 13. Referencias de código

Constantes operativas y clínicas descritas en comentario de metrología:

```1:14:src/modules/device/calibration/calibration-constants.ts
/**
 * Constantes operativas para la calibración local del montaje
 * Besmed CIYO/TB-93500 (espirómetro volumétrico, 5000 mL) + VL53L0X.
 *
 * Notas de metrología:
 * - 500 mL NO representa el cero real del volumen del espirómetro.
 * - 500 mL es el límite inferior OPERATIVO porque el VL53L0X se vuelve
 *   inestable por debajo de ~30 mm y los puntos cercanos al sensor no son
 *   confiables; además, 0–500 mL aporta poca señal terapéutica.
 * ...
 */
```

JSON en firmware:

```387:407:arduino_codes/envio_datos_prueba2/envio_datos_prueba2.ino
void sendRawSensorJson() {
  char jsonBuffer[380];

  snprintf(
    jsonBuffer,
    sizeof(jsonBuffer),
    "{\"source\":\"%s\",\"volumeMl\":%d,\"sustainedTimeMs\":%d,\"validRepetitions\":%d,\"distanceMm\":%d,\"rawDistanceMm\":%d,\"distanceValid\":%s,\"flowState\":\"%s\",\"isValidAttempt\":%s,\"timestamp\":%lu}",
    source,
    volumeMl,
    sustainedTimeMs,
    validRepetitions,
    distanceMm,
    rawDistanceMm,
    distanceValid ? "true" : "false",
    flowState,
    isValidAttempt ? "true" : "false",
    millis()
  );

  webSocket.broadcastTXT(jsonBuffer);
}
```

---

## 14. Limitaciones declaradas

- El modelo es **local al dispositivo móvil**, **experimental** y **no validado clínicamente** en el sentido usado en la app.
- El **timestamp del ESP32** es relativo al arranque (`millis`), no sincronizado a tiempo civil.
- La calibración **no detecta automáticamente** fugas, obstrucciones o uso incorrecto del espirómetro; los chequeos son **geométricos, estadísticos y de protocolo**.

---

*Documento generado a partir del código de la rama de desarrollo; ante cualquier divergencia, prevalece el comportamiento del código fuente.*
