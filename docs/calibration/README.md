# Calibración del espirómetro

---

## Flujo paciente (activo)

En producción con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false`:

| Aspecto | Valor |
|---------|--------|
| Espirómetro | **RESPIRA+ 3000 mL** (único activo) |
| Modelo | Lineal predeterminado validado por el equipo (banco **30 de mayo de 2026**) |
| ID perfil | `cal-predefined-respira-3000-v20260530` |
| Ecuación vigente | `Volumen = 26.11855011086812 × distanceMm − 1194.3556609431557` |
| Clamp | 0–3000 mL (< 0 → 0 mL; > 3000 → 3000 mL) |
| Origen del volumen | **App** (a partir de `distanceMm` del ESP32; el firmware no calcula volumen clínico) |
| Instalación | Automática al primer uso (`predefined-calibration-service.ts`) |
| UI paciente | Termómetro de volumen en `/sensor-connection`; sin pantalla de calibración manual |

Constantes: `src/modules/device/calibration/predefined-calibration-models.ts`.

> **Referencia histórica (no activa):** ecuación anterior de banco `32.566738… × distanceMm − 1270.5786…`. Conservada solo como registro; la app usa la ecuación del 30 de mayo.

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

---

## Legacy

El repositorio conserva migraciones y alias para perfiles **5000 mL** y dispositivos antiguos (`LEGACY_SPIROMETER_DEVICE_5000ML_ID`). La opción «Otro» espirómetro ya no está en el flujo paciente. No eliminar storage legacy sin plan de migración explícito.

Documentación técnica completa: [src/modules/device/calibration/README.md](../../src/modules/device/calibration/README.md).
