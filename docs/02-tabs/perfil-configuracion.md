# Perfil y configuración

## Propósito

Gestión del perfil del paciente activo: datos personales, avatar, evaluación inicial, recordatorios, privacidad/legal, preferencia de práctica táctil y acciones sensibles (retiro de consentimiento, borrado local, cierre de sesión).

## Archivos relacionados

| Tipo | Ruta |
|------|------|
| Ruta principal | `app/profile.tsx` |
| Tab legacy | `app/(tabs)/perfil.tsx` → redirect `/profile` |
| Pantalla | `src/modules/patient/screens/ProfileScreen.tsx` |
| Componentes | `src/modules/patient/components/ProfileInfoCard.tsx`, `ProfileSection.tsx`, `ProfileAvatarPicker.tsx`, `DeletePatientConfirmModal.tsx` |
| Preferencias | `src/modules/patient/storage/profile-preferences-repository.ts` |
| Borrado | `src/modules/patient/patient-delete-service.ts` |
| Contexto | `src/modules/patient/context/PatientSessionContext.tsx` |

## Flujo funcional

1. Muestra datos paciente, stats de sesiones y evaluación.
2. Navega a `/evaluacion-resumen` o `/diagnostico` según estado evaluación.
3. Recordatorios → `/notification-settings`; tarjeta **Recordatorios de terapia** muestra título de estado + `StatusPill` (Activas / Pausadas / Sin permiso / Requiere revisión / Solo en app), recargado con `useIsFocused` y `readNotificationSettingsForDisplay`.
4. Privacidad → `/legal/document`, `/legal/accept`.
5. Toggle práctica táctil (si `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE`).
6. Retiro consent, borrar perfil, logout.

**Nota:** exportación de datos está en **Inicio** (`/data-export`), no en Perfil.

## Datos y persistencia

| Lee | Escribe |
|-----|---------|
| `@rehab/profile_preferences_v1` | Prefs perfil (touch practice) |
| sessions, diagnostics, consent | Borrado vía `patient-delete-service` |
| notification settings | Lee `enabled`, permiso y resumen; no escribe (toggle en pantalla Notificaciones) |

## Dependencias y gates

| Gate | Efecto |
|------|--------|
| Paciente activo | Requerido |
| Consent | Retiro/redirección legal |
| Touch flag | Muestra toggle práctica táctil |

Hooks: `usePatientSession`, `useTouchPracticePreference`, `loadNotificationSettings`.

## Riesgos al modificar

- **Crítico:** borrado de datos locales; retiro de consent.
- **Medio:** logout en local-first redirige a `/auth/login` — **requiere revisión manual** UX.
- **Clínico:** copy de consultar profesional ante síntomas.

## Pendientes o revisión manual

- Discoverability: perfil fuera de tab bar visible (solo `AppTopBar` / quick access).
- Logout route en modo local-first.
- Falta README módulo `src/modules/patient/README.md`.

## Checklist manual mínimo

- [ ] Avatar y nombre persisten tras reinicio.
- [ ] Toggle touch guarda en prefs y afecta launch en Terapia/Inicio.
- [ ] Borrar perfil limpia AsyncStorage del paciente.
- [ ] Retiro consent redirige a flujo legal.
- [ ] Enlaces evaluación, notificaciones y legal funcionan.
- [ ] Estado de recordatorios en Perfil coincide tras pausar/activar en Notificaciones.

## Docs relacionados

- [Notificaciones](../03-features/notificaciones.md)
- [Términos y consentimiento](../03-features/terminos-consentimiento.md)
- [Evaluación inicial](../03-features/evaluacion-inicial.md)
