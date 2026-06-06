# Registros de sesión

## Propósito

Documentar estructura y ciclo de vida de `SessionRecord` y `AttemptRecord`, incluyendo sensor oficial vs práctica táctil.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Tipos | `src/modules/session/types/session-progress.ts` |
| Repositorio | `src/modules/session/storage/session-progress-repository.ts` |
| Servicio | `src/modules/session/session-progress-service.ts` |
| Clasificación | `src/modules/session/session-record-classification.ts` |
| Input mode | `src/modules/session/session-input-mode.ts` |
| Validación | `src/modules/session/sensor-evaluation/*` |

## Flujo funcional

1. `SessionScreen` completa → `SessionResult`.
2. `persistSessionResult` → `createSession` + `createAttempt` × N.
3. Si `isPracticeSession`: **sin** unlock ni update progreso oficial extendido.
4. Si sensor oficial perfecta: `checkAndUnlockNextLevel` (6 acumuladas).

## Campos principales SessionRecord

| Campo | Significado |
|-------|-------------|
| `valid_attempts`, `compliance_percent` | Cumplimiento sesión |
| `max_volume`, `avg_volume`, `avg_hold_seconds` | Métricas (estimadas si sensor) |
| `input_mode` | `sensor` \| `touch_practice` |
| `data_source` | `sensor_model` \| `touch_simulation` |
| `is_practice_session` | true en touch |
| `perfect`, `completed`, `interrupted` | Estado sesión |
| `max_sensor_estimated_volume_ml`, `max_sensor_u95_ml` | Trazabilidad sensor |
| `calibration_profile_id`, `active_model_id`, `spirometer_device_id` | Calibración usada |
| `firmware_version`, `device_id`, `sensor_status`, `sensor_filter` | ESP32 |

## Campos principales AttemptRecord

`hold_ms`, `peak_volume`, `valid`, `sensor_estimated_volume_ml`, `distance_mm`, `raw_distance_mm`, `sensor_attempt_status`, etc.

**No hay campos de presión inspiratoria.**

## Datos y persistencia

| Store | Clave |
|-------|-------|
| Sesiones | `@rehab/sessions_v1` |
| Intentos | `@rehab/attempts_v1` |

## Clasificación UI

| Condición | Etiqueta |
|-----------|----------|
| sensor, no práctica | Sensor |
| touch_practice | Práctica sin sensor |
| sin input_mode legacy | Sin clasificar |

`isTherapeuticSessionRecord` = clasificado + sensor + no práctica → cuenta unlock.

## Riesgos

- Mezclar sesiones touch en métricas oficiales de adherencia clínica.
- `max_volume` en touch es simulación, no volumen espirómetro.

## Pendientes o revisión manual

- Sesión interrumpida: qué se persiste parcialmente — validar en `SessionScreen` + servicio.

## Checklist manual mínimo

- [ ] Sesión sensor guarda trazabilidad cal/firmware cuando aplica.
- [ ] Sesión touch: `is_practice_session=true`, sin unlock.
- [ ] Historial refleja clasificación correcta.
