# Módulo `auth` (acceso)

## Propósito

Gestiona las pantallas de **acceso e identidad inicial** del prototipo: alta y selección de perfil **local** (flujo predeterminado) y, de forma opcional, login/registro **cloud** con Supabase cuando el flag correspondiente está activo.

La autenticación **no sustituye** el consentimiento informado ni la evaluación clínica de apoyo; solo establece quién usa la app en el dispositivo.

RESPIRA+ es un **prototipo académico** en contexto **postoperatorio** (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

```
app/index.tsx (gate) → /auth/local-profile → consentimiento → resto del flujo paciente
```

| Modo | Ruta | Estado en build de referencia |
|------|------|-------------------------------|
| **Local-first** | `/auth/local-profile` | **Activo** — paciente en AsyncStorage |
| **Cloud** | `/auth/login`, `/auth/registro` | **Congelado** por defecto (`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`) |

Tras seleccionar perfil local, el gate redirige a `/legal/accept` si no hay consentimiento activo. La identidad se enlaza con `patient/` vía `PatientSessionProvider`.

Detalle del congelamiento cloud: [README_CLOUD_FREEZE.md](../../../README_CLOUD_FREEZE.md).

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
- **Cloud:** login/registro con Supabase cuando `EXPO_PUBLIC_ENABLE_CLOUD_AUTH=true` (congelado por defecto).
- No sustituye consentimiento ni evaluación clínica; solo identidad/acceso.
- No implementa portal del profesional de salud (scaffold en `clinician/`).

---

## Límites del módulo

- No persiste datos clínicos de sesión (delegado a `session/`, `diagnostics/`).
- No garantiza respaldo remoto en builds local-first.
- Credenciales cloud no deben documentarse ni commitearse en el repositorio.

---

## Documentación canónica

- Gate arranque: `app/index.tsx`
- [Módulo patient](../patient/README.md)
- Consentimiento: `src/modules/legal/consent-service.ts` · [Términos](../../../docs/legal/README-terminos-y-condiciones.md)
- [Arquitectura](../../../docs/01-app-architecture/README.md)
- [Web, PWA y runtime-env](../../../docs/12-web-cloud-migration/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Arquitectura de la app — RESPIRA+* [Documento interno del repositorio]. `docs/01-app-architecture/README.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Web, PWA y runtime-env — RESPIRA+* [Documento interno del repositorio]. `docs/12-web-cloud-migration/README.md`.
