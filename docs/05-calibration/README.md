# Calibración — Índice

Calibración del espirómetro RESPIRA+ **3000 mL** en la app: modelo lineal predefinido (flujo paciente) y calibración técnica multi-volumen (flag dev).

| Documento | Contenido |
|-----------|-----------|
| [patient-flow.md](./patient-flow.md) | Modelo predefinido automático |
| [technical-flow.md](./technical-flow.md) | Captura multi-volumen, U95 |
| [csv-tecnico.md](./csv-tecnico.md) | Export CSV schema 2.4.0 |
| [legacy-5000ml.md](./legacy-5000ml.md) | Perfil 5000 mL histórico |

**No mide presión inspiratoria.** Convierte `distanceMm` → volumen **estimado** (mL).

## Modelo activo paciente

- ID: `cal-predefined-respira-3000-v20260602`
- Ecuación: `28.66324925966009 × distanceMm − 523.8262554875091`
- Clamp: 0–3000 mL
- Fuente: `src/modules/device/calibration/predefined-calibration-models.ts`

## Referencias

- Detalle módulo: [src/modules/device/calibration/README.md](../../src/modules/device/calibration/README.md)
- Doc histórica: [../calibration/README.md](../calibration/README.md)
- Datos: [../06-data-and-storage/README.md](../06-data-and-storage/README.md)
