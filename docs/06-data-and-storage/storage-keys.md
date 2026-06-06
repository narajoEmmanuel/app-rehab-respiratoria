# Claves AsyncStorage

## Propósito

Inventario de claves de persistencia local definidas o usadas en código.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Claves clínicas central | `src/modules/patient/storage-keys.ts` |
| Calibración | `src/modules/device/calibration/calibration-storage-keys.ts` |
| Espirómetro | `src/modules/device/spirometer/spirometer-storage.ts` |
| Legal | `src/modules/legal/constants.ts` |
| Onboarding | `src/modules/onboarding/constants.ts` |
| Notificaciones | `src/modules/notifications/notification-settings.storage.ts` |
| Preferencias perfil | `src/modules/patient/storage/profile-preferences-repository.ts` |
| Niveles progreso | `src/modules/levels/storage/levels-progress-storage.ts` |
| Run activo L1 | `src/modules/levels/storage/level-one-active-run-storage.ts` |

## Claves `@rehab/*` (clínicas)

| Clave | Entidad | Crea | Lee | Modifica |
|-------|---------|------|-----|----------|
| `@rehab/patients_v1` | Lista pacientes | `patient-repository` | `patient-service`, context | create/delete patient |
| `@rehab/patient_id_sequence_v1` | Secuencia IDs | `patient-id-allocation` | allocation | bump on delete |
| `@rehab/current_patient_clave_v1` | Clave activa | `patient-repository` | context, login | set/clear |
| `@rehab/diagnostics_v1` | Evaluaciones | `diagnostic-repository` | diagnostics UI, export | diagnostic-service |
| `@rehab/patient_levels_v1` | Niveles paciente | `generatePatientLevels` | Terapia, session | unlock service |
| `@rehab/sessions_v1` | Sesiones | `session-progress-repository` | history, summary, export | session-progress-service |
| `@rehab/attempts_v1` | Intentos | idem | idem | idem |
| `@rehab/legal_consent_v1` | Consentimiento | `consent-service` | guards, export | accept/withdraw |
| `@rehab/onboarding_welcome_seen_v1_u{id}` | Onboarding | `onboarding-storage` | HomeScreen | mark seen |

**Nota:** `@rehab/profile_preferences_v1` está en `storage-keys.ts` pero **no se usa** en runtime; prefs reales usan `respira_profile_preferences_{patientId}` — **requiere revisión manual** al unificar.

## Claves `@respira_*` (dispositivo/calibración)

| Clave | Contenido |
|-------|-----------|
| `@respira_spirometer_devices_v1` | Dispositivos espirómetro |
| `@respira_active_spirometer_device_id_v1` | ID activo |
| `@respira_device_calibration_profiles_by_spirometer_v1` | Perfiles cal |
| `@respira_active_calibration_models_by_spirometer_v1` | Modelos activos |
| `@respira_device_calibration_profile_v1` | Legacy single profile |
| `@respira_calibration_legacy_migrated_v1` | Flag migración |

**No se borran** al eliminar perfil paciente (`patient-delete-service.ts` comentario explícito).

## Otras claves

| Patrón | Módulo |
|--------|--------|
| `respira_notification_settings_{patientId}` | Notificaciones |
| `respira_profile_preferences_{patientId}` | Preferencias perfil |
| `rehab.levels.progress.v1.u{patientId}` | Progreso niveles |
| `rehab.levels.level_one_active_run.v1.u{patientId}` | Run sesión L1 |

## Riesgos

- Claves duplicadas/legacy (`rehab.levels.progress.v1` global migrada).
- Borrar calibración al borrar paciente podría afectar otro usuario del mismo dispositivo — diseño intencional no borrar.

## Pendientes o revisión manual

- Alinear `@rehab/profile_preferences_v1` con implementación real o eliminar de storage-keys.
- Cloud Supabase keys — ver `README_CLOUD_FREEZE.md`.

## Checklist manual mínimo

- [ ] Tras crear paciente: entradas en `@rehab/patients_v1` y clave actual.
- [ ] Tras sesión: `@rehab/sessions_v1` + attempts incrementan.
- [ ] Borrar perfil: claves paciente limpias; `@respira_*` intactas.
