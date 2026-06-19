# Calibración — Índice

Este índice describe la **calibración del espirómetro RESPIRA+ 3000 mL** en la aplicación móvil: conversión de distancia medida por el sensor ToF VL53L0X en **volumen inspirado estimado (mL)**. RESPIRA+ es un prototipo académico de apoyo terapéutico en **pacientes adultos postoperatorios**; la calibración documentada aquí respalda **monitoreo funcional preliminar**, no diagnóstico espirométrico clínico.

**No mide presión inspiratoria.** Convierte `distanceMm` → volumen **estimado** (mL) en la app; el ESP32 transmite distancia, no volumen clínico.

---

## Principio de medición

1. El **VL53L0X** estima la **distancia** (mm) al pistón del espirómetro incentivador.
2. La **aplicación** aplica un **modelo matemático** (regresión lineal predefinida en flujo paciente) para obtener volumen en mL.
3. El volumen mostrado al usuario es **indirecto** y depende del montaje físico sensor–pistón–unidad de espirómetro.

Flujo detallado: [04-device-and-sensor/sensor-flow.md](../04-device-and-sensor/sensor-flow.md).

---

## Modelo canónico vigente (junio 2026)

Calibración de banco validada el **2 de junio de 2026** e instalada automáticamente en el flujo paciente:

| Parámetro | Valor |
|-----------|--------|
| ID interno | `cal-predefined-respira-3000-v20260602` |
| ID visible | `R3K-20260602-LIN-v2` |
| Ecuación | `28.66324925966009 × distanceMm − 523.8262554875091` |
| R² | **0,992** (0,9921507156019185 en código) |
| MAE | **65,36 mL** |
| Clamp | 0–3000 mL |
| Fuente código | `src/modules/device/calibration/predefined-calibration-models.ts` |

Documentación metrológica completa: [README-csv-tecnico-calibracion.md](../calibration/README-csv-tecnico-calibracion.md).

### Reconciliación con métricas anteriores

Informes previos del repositorio (p. ej. [auditoría mayo 2026](../AUDITORIA-TECNICA-SENSOR-ESP32.md)) pueden citar ecuaciones o métricas distintas (R² = 0,9962; MAE = 41 mL). Corresponden a **sesiones o modelos históricos**, no al modelo predefinido instalado hoy. Véase [Validación académica](../09-academic-validation/README.md), sección de reconciliación.

---

## Documentos de esta carpeta

| Documento | Contenido |
|-----------|-----------|
| [patient-flow.md](./patient-flow.md) | Modelo predefinido automático en flujo paciente |
| [technical-flow.md](./technical-flow.md) | Captura multi-volumen, U95 (modo técnico) |
| [csv-tecnico.md](./csv-tecnico.md) | Export CSV schema 2.4.0 |
| [legacy-5000ml.md](./legacy-5000ml.md) | Perfil 5000 mL histórico (no activo en paciente) |

---

## Modos de calibración

| Modo | Flag | Uso |
|------|------|-----|
| **Paciente (default)** | `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false` | Modelo lineal predefinido; sin pasos manuales |
| **Técnico / laboratorio** | `true` | Multi-volumen, repetibilidad, U95, export CSV técnico |

---

## Limitaciones clínicas de la estimación

- El volumen es **estimado**; no equivale a espirometría clínica certificada.
- El modelo aplica al **sistema RESPIRA+ concreto** calibrado en banco.
- La validación clínica formal del prototipo permanece **pendiente**.

---

## Referencias cruzadas

- Detalle módulo: [src/modules/device/calibration/README.md](../../src/modules/device/calibration/README.md)
- Validación académica: [09-academic-validation/README.md](../09-academic-validation/README.md)
- Doc histórica: [../calibration/README.md](../calibration/README.md)
- Datos y export: [../06-data-and-storage/README.md](../06-data-and-storage/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Diccionario técnico del CSV de calibración* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, archivo `docs/calibration/README-csv-tecnico-calibracion.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Documentación técnica del módulo de calibración* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `src/modules/device/calibration/`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *RESPIRA+: Validación académica* [Documento interno del proyecto]. En repositorio `app-rehab-respiratoria`, carpeta `docs/09-academic-validation/`.
