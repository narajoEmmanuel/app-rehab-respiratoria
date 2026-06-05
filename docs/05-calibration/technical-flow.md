# Calibración — Flujo técnico

## Propósito

Procedimiento multi-volumen, repetibilidad, U95 y validación geométrica — **solo** con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true`.

No es el flujo principal del paciente postoperatorio.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Flag | `src/modules/device/calibration/technical-calibration-flags.ts` |
| Captura | `src/modules/device/screens/SensorCalibrationTechnicalCaptureScreen.tsx` |
| Técnica UI | `src/modules/device/screens/SensorCalibrationTechnicalScreen.tsx` |
| No disponible | `src/modules/device/screens/TechnicalCalibrationUnavailableScreen.tsx` |
| Resumen | `app/calibration-technical-summary.tsx` → `CalibrationTechnicalSummaryScreen.tsx` |
| Matemática | `src/modules/device/calibration/calibration-math.ts`, `calibration-model.ts` |
| Incertidumbre | `src/modules/device/calibration/calibration-uncertainty.ts` |
| Export CSV | `src/modules/export/services/calibration-technical-export-service.ts` |
| Perfiles técnicos | `src/modules/device/spirometer/technical-spirometer-options.ts` |

## Flujo funcional

1. `/sensor-calibration` → flujo técnico si flag ON.
2. Selección perfil (3000 mL paciente o **5000 mL solo técnico**).
3. Captura: volúmenes obligatorios (6×500–3000 mL en 3000 mL), 5 repeticiones → 30 puntos mínimos.
4. Bloqueo captura si `distanceMm < 30` mm.
5. Generación modelo (`linear_regression` / `piecewise_linear`), métricas R², RMSE, U95.
6. Resumen técnico y export CSV schema 2.4.0.

## Datos usados

Puntos `CalibrationCapturePoint`: `volumeMl`, `distanceMm`, repeticiones, summaries.

## Datos persistidos

Mismas claves `@respira_*` que flujo paciente; modelos adicionales por `spirometerDeviceId`.

## Relación RESPIRA+ 3000 mL

Flujo paciente sigue usando **solo** predefinido 3000 mL. Flujo técnico puede calibrar hardware de banco con marcas 250–3000 mL (chips en `spirometer-profiles.ts`).

## Exportación técnica

CSV vía `calibration-technical-export-service.ts` — ver [csv-tecnico.md](./csv-tecnico.md).

## Riesgos

- Activar flag en build paciente expone UI no validada clínicamente.
- Perfil 5000 mL solo compatibilidad metrológica — ver [legacy-5000ml.md](./legacy-5000ml.md).

## Pendientes o revisión manual

- `SensorCalibrationTechnicalCaptureScreen` muy grande (~95 estilos inline).
- Validación geométrica habilitada solo perfil legacy 5000 mL.

## Checklist manual mínimo

- [ ] Flag off: pantalla técnica no accesible.
- [ ] Flag on: captura 30 puntos y guarda modelo.
- [ ] U95 visible en resumen técnico.
- [ ] Export CSV genera archivo schema 2.4.0.

## Docs relacionados

- [CSV técnico](./csv-tecnico.md)
- [README módulo cal](../../src/modules/device/calibration/README.md)
