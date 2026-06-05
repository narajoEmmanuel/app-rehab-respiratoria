# Modelos de datos

## Propósito

Mapa de entidades TypeScript principales, archivos de definición y relaciones.

## Archivos relacionados

| Entidad | Definición |
|---------|------------|
| Paciente | `src/modules/patient/types.ts` → `PatientRecord` |
| Preferencias | `src/modules/patient/types/profile-preferences.ts` |
| Evaluación | `src/modules/diagnostics/types.ts` |
| Niveles paciente | `src/modules/diagnostics/types.ts` → `PatientLevelRecord` |
| Sesión / intento | `src/modules/session/types/session-progress.ts` |
| Resultado runtime | `src/modules/session/types/session-result.ts` |
| Consent | `src/modules/legal/types.ts` |
| Calibración | `src/modules/device/calibration/calibration-types.ts`, `calibration-model-types.ts`, `active-calibration-types.ts` |
| Espirómetro | `src/modules/device/spirometer/spirometer-types.ts` |
| Sensor lectura | `src/modules/device/types/sensor-reading.ts` |
| Export | `src/modules/export/types/export-record.ts` |

Stubs futuros SQLite en `patient/types.ts` (`PlanSemanalRecord`, etc.) — **no persistidos** hoy.

## Entidades resumidas

### PatientRecord
`paciente_id`, `clave`, `nombre_completo`, `edad`, `current_level_id`, `racha_actual`, fechas.

### DiagnosticRecord
`max_inspiratory_volume` (VIM apoyo), `attempts[]`, `consistency_summary` — **no diagnóstico clínico**.

### PatientLevelRecord
`level_id`, `target_volume`, `level_status`, `perfect_sessions_completed`.

### SessionRecord / AttemptRecord
Ver [session-records.md](./session-records.md).

### ClinicalExportSnapshot
Ver [export-schema-v2.4.0.md](./export-schema-v2.4.0.md).

## Quién crea / lee / modifica

| Entidad | Crea | Lee | Modifica |
|---------|------|-----|----------|
| Patient | `patient-service`, local-profile | Context, todas las tabs | Profile, delete |
| Diagnostic | `diagnostic-service` post-examen | Home, Terapia, export | Re-eval |
| PatientLevel | `generatePatientLevels` | Levels, session | unlock service |
| Session | `persistSessionResult` | History, summary, export | — |
| Consent | `consent-service` | guards | withdraw |
| Calibration | predefined / technical services | volume-estimation | cal screens (flag) |

## Exportación

Snapshot agrega patient + diagnostics + levels + sessions + attempts + calibration block.

## Riesgos datos sensibles

- Nombre, edad, clave, volúmenes estimados, historial — datos de salud locales.
- Export JSON/CSV — tratar como confidencial.

## Pendientes o revisión manual

- Tipos `patient/types.ts` futuros vs AsyncStorage actual.
- Mojibake comentarios en `session-progress.ts` (encoding).

## Checklist manual mínimo

- [ ] Tipos session incluyen `input_mode` y trazabilidad cal en sesiones nuevas.
- [ ] Registros antiguos sin `input_mode` clasificados «Sin clasificar».
