# Calibración — Flujo paciente

## Propósito

Instalar y usar automáticamente el modelo lineal predefinido **RESPIRA+ 3000 mL** sin pasos manuales visibles al paciente (`EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=false` por defecto).

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Instalación modelo | `src/modules/device/calibration/predefined-calibration-service.ts` |
| Constantes modelo | `src/modules/device/calibration/predefined-calibration-models.ts` |
| Perfil espirómetro | `src/modules/device/spirometer/spirometer-profiles.ts` |
| Storage | `src/modules/device/calibration/calibration-storage.ts` |
| Modelo activo | `src/modules/device/calibration/active-calibration-storage.ts` |
| Estimación | `src/modules/device/volume-estimation/volume-estimation-service.ts` |
| Readiness | `src/modules/device/volume-estimation/therapy-readiness-service.ts` |
| Pantalla paciente | `src/modules/device/screens/SensorCalibrationPatientScreen.tsx` |
| Router cal | `src/modules/device/screens/SensorCalibrationScreen.tsx` |
| Ruta | `app/sensor-calibration.tsx` |

## Flujo funcional

1. Primer uso: `ensureRespira3000PredefinedCalibrationInstalled()`.
2. Perfil activo: `spirometer_3000ml_default` / dispositivo `respira-spiro-3000-001`.
3. Marcas volumen UI: 250–3000 mL pasos 250 (`VOLUME_CHIPS_3000ML_ML`).
4. `distanceMm` → volumen estimado; clamp 0–3000 mL.
5. Readiness terapia/evaluación verifica modelo activo + rango.

## Datos usados

- `distanceMm`, `rawDistanceMm`, `distanceValid` del WebSocket.
- Coeficientes lineales predefinidos (banco 2026-06-02).

## Datos persistidos

| Clave | Contenido |
|-------|-----------|
| `@respira_device_calibration_profiles_by_spirometer_v1` | Perfiles por dispositivo |
| `@respira_active_calibration_models_by_spirometer_v1` | Modelo activo + `isReadyForTherapy` |
| `@respira_spirometer_devices_v1` | Dispositivos |
| `@respira_active_spirometer_device_id_v1` | ID activo |

Ver `calibration-storage-keys.ts`.

## Marcas del espirómetro

Chips 250, 500, …, 3000 mL en perfil 3000 mL — referencia visual y técnica, no presión.

## Exportación

Bloque calibración opcional en export clínico v2.4.0 (`ClinicalExportSnapshot.calibration`).

## Riesgos de calibración

- Extrapolación fuera de rango calibrado banco (250–3000 mL referencia).
- `MIN_RELIABLE_SENSOR_DISTANCE_MM = 30` (`calibration-constants.ts`) — por debajo, VL53L0X inestable.
- Confundir estimación con espirometría clínica certificada.

## Pendientes o revisión manual

- Pantalla calibración paciente vs auto-install invisible — UX según build.
- Valores > 3000 mL en UI (sobre rango visual).

## Checklist manual mínimo

- [ ] Primer arranque: modelo predefinido instalado sin acción usuario.
- [ ] Termómetro 0–3000 coherente con pistón.
- [ ] Terapia oficial bloqueada sin readiness OK.
- [ ] Touch practice no exige calibración para simular.

## Docs relacionados

- [Flujo técnico](./technical-flow.md)
- [Sensor flow](../04-device-and-sensor/sensor-flow.md)
