# Export schema v2.4.0

## Propósito

Describir el snapshot de exportación clínica local (`ClinicalExportSnapshot`) versión **2.4.0** / schema **1.0.0**.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Tipos | `src/modules/export/types/export-record.ts` |
| Agregador | `src/modules/export/services/clinical-export-service.ts` |
| Constantes | `CLINICAL_EXPORT_FORMAT_VERSION = '2.4.0'`, `CLINICAL_EXPORT_SCHEMA_VERSION = '1.0.0'` |
| JSON | `src/modules/export/formatters/clinical-json-exporter.ts` |
| CSV | `src/modules/export/formatters/clinical-csv-exporter.ts` |
| Paciente bundle | `src/modules/export/services/patient-clinical-export-service.ts` |
| Sesiones | `src/modules/export/services/session-export-service.ts` |
| Pantalla | `src/modules/export/screens/DataExportScreen.tsx` |

CSV técnico calibración (distinto): schema 2.4.0 en `calibration-technical-csv-exporter.ts` — ver [../05-calibration/csv-tecnico.md](../05-calibration/csv-tecnico.md).

## Flujo funcional

1. `getClinicalExportSnapshot(patientId)` lee paciente, diagnostics, levels, sessions+attempts, bloque cal opcional.
2. `exportPatientJson` / `exportPatientCsv` serializa.
3. Usuario comparte archivo para revisión con profesional — **no es informe diagnóstico certificado**.

## Estructura ClinicalExportSnapshot

| Campo | Contenido |
|-------|-----------|
| `export_version` | `'2.4.0'` |
| `export_schema_version` | `'1.0.0'` |
| `app_version` | De Expo config |
| `firmware_version` | Reservado (null si no reportado) |
| `exported_at` | ISO timestamp |
| `patient` | `PatientRecord` |
| `diagnostics` | `DiagnosticRecord[]` |
| `patient_levels` | `PatientLevelRecord[]` |
| `sessions` | `{ session, attempts[] }[]` |
| `calibration?` | `CalibrationExportBlock` — perfil/modelo activo, métricas |

Sesiones incluyen `input_mode`, volúmenes **estimados**, U95 cuando existió, estado intentos sensor.

## Quién crea / lee

| Acción | Módulo |
|--------|--------|
| Crea snapshot | `clinical-export-service` (lectura agregada) |
| Lee stores | repositories session, diagnostic, patient; volume-estimation para cal |
| Modifica storage | **No** |

## Relación sensor / touch

Export preserva clasificación; práctica táctil identificable en campos de sesión/intento.

## Riesgos

- Version drift si README antiguo cita 2.1.0 (corregido en Fase 1A).
- Compartir export en canales inseguros.

## Pendientes o revisión manual

- Campos CSV column-by-column — ver implementación `clinical-csv-exporter.ts` para auditoría detallada futura.

## Checklist manual mínimo

- [ ] JSON contiene `export_version: "2.4.0"`.
- [ ] Incluye al menos una sesión post-export de prueba.
- [ ] Bloque calibration presente con modelo 3000 mL predefinido activo.
- [ ] Sesiones touch marcadas en campos de clasificación.
