# Privacidad y datos locales

## Propósito

Resumir qué datos viven en el dispositivo, qué se exporta, qué se borra y riesgos de privacidad clínica.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Borrado paciente | `src/modules/patient/patient-delete-service.ts` |
| Verificación | `src/modules/patient/patient-delete-verification.ts` |
| Consent | `src/modules/legal/consent-service.ts` |
| Export | `src/modules/export/screens/DataExportScreen.tsx` |
| Cloud freeze | [README_CLOUD_FREEZE.md](../../README_CLOUD_FREEZE.md) |
| Legal equipo | [../legal/README-terminos-y-condiciones.md](../legal/README-terminos-y-condiciones.md) |

## Datos locales sensibles

- Identificación paciente (nombre, edad, clave).
- Historial sesiones, VIM, objetivos por nivel.
- Consentimiento y preferencias.
- **No** presión inspiratoria; volúmenes **estimados**.

## Al borrar perfil (`deletePatientLocalData`)

**Elimina** (paciente `patientId`):

- Sesiones e intentos
- Diagnostics y patient_levels
- Entrada en lista pacientes
- Notificaciones programadas + settings
- Preferencias perfil (`respira_profile_preferences_*`)
- Progreso niveles + active run
- Consent local si `userId` coincide
- Clave actual si era la del paciente borrado

**No elimina:**

- Calibración `@respira_*` ni dispositivos espirómetro (compartidos a nivel app/dispositivo físico)

## Exportación

Usuario inicia export; archivo sale del dispositivo vía share. Responsabilidad del usuario y contexto clínico acordado.

## Cloud (opcional)

Con `EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true`, Supabase puede almacenar datos — congelado por defecto. Ver notas seguridad `docs/supabase-security-notes.md`.

## Riesgos

- Pérdida total si borrar perfil sin export previo.
- Dispositivo no cifrado a nivel OS — riesgo físico del teléfono.
- `seedLocalPrototypeConsentForPatient` en dev — no producción clínica real.

## Pendientes o revisión manual

- Política retención post-export.
- Cifrado AsyncStorage — no implementado en código revisado.

## Checklist manual mínimo

- [ ] Borrar perfil elimina sesiones del paciente en `@rehab/sessions_v1`.
- [ ] Calibración 3000 mL sigue presente tras borrar perfil.
- [ ] Export requiere consent activo.
- [ ] Copy export menciona revisión con profesional.

## Docs relacionados

- [Storage keys](./storage-keys.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
