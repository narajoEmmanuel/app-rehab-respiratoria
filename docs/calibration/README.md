# Calibración del espirómetro

Procedimiento implementado en `src/modules/device/calibration/` y UI en `SensorCalibrationScreen`.

---

## Alcance por perfil

| Perfil | Volúmenes obligatorios | Rango recomendado | Extendido | Geométrica |
|--------|------------------------|-------------------|-----------|------------|
| 5000 mL | 500–3000 (6 puntos) | 500–3000 mL | hasta 5000 mL | Sí (~10 mm / 500 mL) |
| 3000 mL | 500–3000 (6 puntos) | 500–3000 mL | — | No (pendiente regla) |

Constantes compartidas: `calibration-constants.ts` (repeticiones, U95 máx. 250 mL, distancia mínima 30 mm).

---

## Captura

- **5 mediciones** por volumen obligatorio (`MIN_REPETITIONS_PER_REQUIRED_VOLUME`).
- **30 puntos** mínimos para habilitar terapia (`MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY`).
- Estabilidad por desviación típica de distancia (estable / aceptable / variable).
- **Recaptura** guiada cuando un volumen supera umbrales de variación.

---

## Calidad del modelo

- **Repetibilidad:** `MAX_ACCEPTABLE_STD_DISTANCE_MM`, variación de pendiente entre segmentos.
- **Validación geométrica:** pasos de distancia vs. incrementos de 500 mL (perfil 5000).
- **Incertidumbre:** componentes de sensor, alineación, marca del espirómetro; **U95** con k=2.

---

## Modelos

| Tipo | Uso |
|------|-----|
| `linear_regression` | Referencia y control de calidad |
| `piecewise_linear` | Preferido con suficientes tramos distintos |

Selección y evaluación: `calibration-model.ts`, `calibration-model-evaluation.ts`.

El **modelo activo** se guarda en `active-calibration-storage` por `spirometerDeviceId`.

---

## Terapia

Antes de iniciar nivel, `therapy-readiness-service` comprueba:

- Sensor conectado (si aplica).
- Modelo activo listo (`isReadyForTherapy`).
- Estimación dentro del rango calibrado cuando corresponde.

No se inicia un segundo WebSocket en terapia; se reutiliza `useActiveVolumeEstimate`.

---

## Legacy

El repositorio puede contener migraciones y alias (`CURRENT_SPIROMETER_PROFILE`, constantes @deprecated) para no perder calibraciones antiguas. No eliminar storage legacy sin plan de migración explícito.
