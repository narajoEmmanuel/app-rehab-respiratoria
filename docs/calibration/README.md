# Calibración del espirómetro

---

## Flujo paciente (activo)

En producción con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false`:

| Aspecto | Valor |
|---------|--------|
| Espirómetro | **RESPIRA+ 3000 mL** (único activo) |
| Modelo | Lineal predeterminado validado por el equipo (banco **2 de junio de 2026**) |
| ID perfil | `cal-predefined-respira-3000-v20260602` |
| ID visible | `R3K-20260602-LIN-v2` |
| Ecuación vigente | `Volumen = 28.66324925966009 × distanceMm − 523.8262554875091` |
| Clamp | 0–3000 mL (< 0 → 0 mL; > 3000 puede mostrarse como sobre rango visual) |
| Origen del volumen | **App** (a partir de `distanceMm` del ESP32; el firmware no calcula volumen clínico) |
| Instalación | Automática al primer uso (`predefined-calibration-service.ts`) |
| UI paciente | Termómetro de volumen en `/sensor-connection`; sin pantalla de calibración manual |

Constantes: `src/modules/device/calibration/predefined-calibration-models.ts`.

---

## Calibración técnica (modo técnico)

Procedimiento implementado en `src/modules/device/calibration/` y UI en `SensorCalibrationScreen`. Solo accesible con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true`.

### Alcance por perfil

| Perfil | Estado | Volúmenes obligatorios | Rango | Geométrica |
|--------|--------|------------------------|-------|------------|
| **3000 mL (RESPIRA+)** | Activo | 500–3000 (6 puntos) | 0–3000 mL (clamp UI) | No |
| 5000 mL (Besmed) | **Legacy** | 500–3000 (6 puntos) | extendido hasta 5000 mL | Sí (~10 mm / 500 mL) |

Constantes compartidas: `calibration-constants.ts` (repeticiones, U95 máx. 250 mL, distancia mínima 30 mm).

---

## Captura (modo técnico)

- **5 mediciones** por volumen obligatorio (`MIN_REPETITIONS_PER_REQUIRED_VOLUME`).
- **30 puntos** mínimos para habilitar terapia con calibración custom (`MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY`).
- Estabilidad por desviación típica de distancia (estable / aceptable / variable).
- **Recaptura** guiada cuando un volumen supera umbrales de variación.

---

## Calidad del modelo (modo técnico)

- **Repetibilidad:** `MAX_ACCEPTABLE_STD_DISTANCE_MM`, variación de pendiente entre segmentos.
- **Validación geométrica:** pasos de distancia vs. incrementos de 500 mL (solo perfil legacy 5000 mL).
- **Incertidumbre:** componentes de sensor, alineación, marca del espirómetro; **U95** con k=2. Visible solo en modo técnico/debug.

---

## Modelos

| Tipo | Uso |
|------|-----|
| `linear_regression` | Modelo activo predeterminado RESPIRA+ 3000 mL |
| `piecewise_linear` | Referencia exportable; preferido en calibración técnica con suficientes tramos |

Selección y evaluación: `calibration-model.ts`, `calibration-model-evaluation.ts`.

El **modelo activo** se guarda en `active-calibration-storage` por `spirometerDeviceId`.

---

## Terapia

Antes de iniciar nivel, `therapy-readiness-service` comprueba:

- Sensor conectado con señal viva (si aplica).
- Modelo activo listo (`isReadyForTherapy`).
- Estimación dentro del rango calibrado cuando corresponde.
- **No reutiliza lecturas obsoletas** si el stream dejó de enviar datos.

No se inicia un segundo WebSocket en terapia; se reutiliza `useActiveVolumeEstimate`.

---

## Exportación técnica

CSV/JSON con R², U95, pendiente, intercepto y curvas de referencia: disponible en modo técnico/debug. **No forma parte del flujo paciente.**

- [README técnico del CSV de calibración](README-csv-tecnico-calibracion.md) — diccionario de datos, unidades, métricas y limitaciones (formato APA 7).

### Qué datos de puntos incluye el CSV

El mismo archivo CSV (esquema 2.4.0) puede contener **distinto nivel de detalle** según desde dónde se exporte:

| Origen | ¿Cada captura individual (p. ej. 5 repeticiones × volumen)? |
|--------|---------------------------------------------------------------|
| Calibración **predeterminada oficial** (resumen técnico, `DataExportScreen`, perfil de banco jun. 2026) | **No** — exporta el **modelo ya calculado** (pendiente, intercepto, métricas) y **puntos resumidos** (~8 promedios por volumen o ~9 puntos de curva de referencia). En metadatos compactos, `points_count = 40` indica que el ajuste de banco usó 40 mediciones (8 volúmenes × 5 repeticiones), pero esas 40 filas crudas **no** se vuelcan al CSV desde la app. |
| **Captura técnica manual** (`SensorCalibrationTechnicalCaptureScreen`) | **Sí** — una fila por cada punto registrado en `profile.points` (cada «Registrar punto» con su repetición, distancia, std, etc.). |

La calibración vigente en producción se ajustó en banco con 40 capturas; los promedios por volumen están en `predefined-calibration-models.ts` (`RESPIRA_3000_CALIBRATED_POINTS`). Para auditoría de las 40 mediciones brutas del banco, conservar el informe original del laboratorio; el CSV de la app certifica el modelo adoptado en el dispositivo (`R3K-20260602-LIN-v2` / `cal-predefined-respira-3000-v20260602`).

Desarrollo completo, ejemplos y tabla comparativa: [README técnico del CSV — Qué puntos incluye](README-csv-tecnico-calibracion.md#puntos-en-csv).

---

## Legacy

El repositorio conserva migraciones y alias para perfiles **5000 mL** y dispositivos antiguos (`LEGACY_SPIROMETER_DEVICE_5000ML_ID`). La opción «Otro» espirómetro ya no está en el flujo paciente. No eliminar storage legacy sin plan de migración explícito.

**CSV de ejemplo antiguo (may 2026):** no usar como calibración vigente. Está en [legacy/](legacy/) con prefijo `legacy_` y nota explícita. La referencia de banco activa es **jun. 2026** (`R3K-20260602-LIN-v2`).

Documentación técnica completa: [src/modules/device/calibration/README.md](../../src/modules/device/calibration/README.md).
