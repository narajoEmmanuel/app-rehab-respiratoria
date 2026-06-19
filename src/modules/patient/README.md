# Módulo `patient` (identidad y perfil local)

## Propósito

Gestiona la **identidad del paciente en el dispositivo**: alta y selección de perfil local, contexto de sesión activa (`PatientSessionProvider`), preferencias, pantalla de perfil y **borrado de datos locales**. En el modelo **local-first** (predeterminado), toda la trazabilidad clínica del prototipo se asocia a un `patient_id` en AsyncStorage.

RESPIRA+ es un **prototipo académico** de apoyo en **pacientes adultos postoperatorios**; este módulo no sustituye un expediente clínico hospitalario (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

```
/auth/local-profile → PatientSessionProvider → consentimiento → evaluación → terapia → historial / export
```

| Función | Dependencia de paciente |
|---------|-------------------------|
| Evaluación VIM | Filtra `@rehab/diagnostics_v1` por `patient_id` |
| Terapia y niveles | Progreso en claves `u{patientId}` |
| Historial / resumen | Agregados por paciente activo |
| Exportación | Snapshot del perfil y datos clínicos locales |
| Clave de acceso | Mostrada en Inicio para identificación local |

**Cloud / Supabase:** opcional y **congelado** por defecto (`EXPO_PUBLIC_ENABLE_CLOUD_AUTH=false`). Ver [README_CLOUD_FREEZE.md](../../../README_CLOUD_FREEZE.md) y [auth/README.md](../auth/README.md).

---

## Archivos principales

| Rol | Archivo / carpeta |
|-----|-------------------|
| Contexto global | `context/PatientSessionContext.tsx` — `PatientSessionProvider` |
| Servicio | `patient-service.ts` — CRUD local, paciente actual |
| Claves storage | `storage-keys.ts` — prefijo `@rehab/*` (fuente de verdad) |
| Pantalla perfil | `screens/ProfileScreen.tsx` ← `app/profile.tsx` |
| Preferencias | Módulos de prefs (p. ej. práctica táctil) |

Provider registrado en `app/_layout.tsx` junto a sensor, niveles y app-mode.

---

## Datos y privacidad

- Datos clínicos residen **solo en el dispositivo** salvo que el usuario exporte o comparta archivos.
- Borrado local elimina registros asociados al paciente según implementación en servicio de perfil.
- No implica respaldo en la nube en builds de referencia actuales.

Detalle: [Privacidad y datos locales](../../../docs/06-data-and-storage/privacy-and-local-data.md).

---

## Límites del módulo

- No valida identidad frente a un sistema hospitalario.
- No administra roles clínicos ni acceso del profesional (scaffold en `clinician/`).
- La clave de acceso es identificador local del prototipo, no credencial médica.

---

## Documentación canónica

- [Autenticación local](../auth/README.md)
- [Datos y almacenamiento](../../../docs/06-data-and-storage/README.md)
- [Términos y consentimiento](../../../docs/legal/README-terminos-y-condiciones.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Arquitectura](../../../docs/01-app-architecture/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Datos y almacenamiento — RESPIRA+* [Documento interno del repositorio]. `docs/06-data-and-storage/README.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.
