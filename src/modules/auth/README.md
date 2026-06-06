# Módulo `auth` (acceso)

Pantallas de acceso local y flujo cloud opcional. En modo **local-first** (default) el gate de arranque usa `/auth/local-profile` para alta/selección de paciente local.

---

## Pantallas

| Ruta | Pantalla | Modo |
|------|----------|------|
| `/auth/local-profile` | `LocalProfileScreen` | Local-first (principal) |
| `/auth/login` | `LoginScreen` | Cloud (`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true`) |
| `/auth/registro` | `RegistroScreen` | Cloud |

Componentes compartidos: `AuthWelcomeView`, `AuthCreateProfileView`, `AuthGeneratedKeyView`, `AuthFlowChrome`, `AuthRegistrationHeader`.

Tipografía: migrado a `AppText` (Fase 4K). Ver [docs/07-ui-design-system/typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md).

---

## Alcance actual

- **Local-first:** creación/selección de paciente en AsyncStorage; redirección a `/legal/accept` si no hay consent activo.
- **Cloud:** login/registro con Supabase cuando `EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true` (congelado por defecto — ver [README_CLOUD_FREEZE.md](../../../README_CLOUD_FREEZE.md)).
- No sustituye consentimiento ni evaluación clínica; solo identidad/acceso.

---

## Referencias

- Gate arranque: `app/index.tsx`
- Paciente: `src/modules/patient/patient-service.ts`
- Consentimiento: `src/modules/legal/consent-service.ts`
- [Arquitectura](../../docs/architecture.md)
