# Datos y almacenamiento — Índice

## Contexto académico

RESPIRA+ persiste la información del paciente en el dispositivo bajo un modelo **local-first**: AsyncStorage con prefijo `@rehab/*`, sin backend obligatorio en el flujo de referencia. Los datos clínicos del prototipo (VIM, sesiones, intentos, progreso de niveles) permanecen en el teléfono hasta que el usuario **exporta** un archivo para revisión profesional o **borra** el perfil local.

Este diseño prioriza **privacidad** y simplicidad académica. Cloud/Supabase está **congelado** por defecto. RESPIRA+ es apoyo en **pacientes adultos postoperatorios**, no un expediente hospitalario ni producto sanitario registrado (ITESM, 2026).

---

## Propósito del área documental

Documentar entidades, claves de almacenamiento, esquema de exportación v2.4.0 y políticas de privacidad/borrado. Los módulos de runtime (`patient/`, `session/`, `diagnostics/`, `export/`) implementan la persistencia descrita aquí.

---

## Relación con módulos funcionales

| Módulo | Stores principales |
|--------|-------------------|
| `patient/` | Perfil, claves `@rehab/*`, contexto activo |
| `diagnostics/` | `@rehab/diagnostics_v1`, `@rehab/patient_levels_v1` |
| `session/` | `@rehab/sessions_v1`, `@rehab/attempts_v1`, progreso de partida |
| `device/` | Modelo de calibración activo (metadatos en sesión/export) |
| `export/` | Lectura agregada → JSON/CSV v2.4.0 |
| `history/` / `summary/` | Lectura de sesiones e intentos (sin mutación) |

**Modo sensor vs touch:** los registros incluyen `input_mode` e `is_practice_session` para separar sesión oficial de práctica simulada.

---

## Documentos del área

| Documento | Contenido |
|-----------|-----------|
| [storage-keys.md](./storage-keys.md) | Claves AsyncStorage |
| [data-models.md](./data-models.md) | Entidades TypeScript |
| [session-records.md](./session-records.md) | Sesiones e intentos |
| [export-schema-v2.4.0.md](./export-schema-v2.4.0.md) | Export clínico |
| [privacy-and-local-data.md](./privacy-and-local-data.md) | Privacidad y borrado |

---

## Fuente de verdad claves clínicas

`src/modules/patient/storage-keys.ts` — prefijo `@rehab/*` para datos de paciente/sesión/diagnóstico.

---

## Límites

- No hay respaldo en la nube en builds de referencia actuales.
- Exportación no certifica exactitud clínica.
- El módulo `clinician/` no persiste ni sincroniza datos (scaffold).

---

## Documentación canónica

- [Arquitectura](../01-app-architecture/README.md)
- [Exportación de datos](../03-features/exportacion-datos.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Validación académica](../09-academic-validation/README.md)
- [Privacidad](./privacy-and-local-data.md)
- [Módulo patient](../../src/modules/patient/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Privacidad y datos locales — RESPIRA+* [Documento interno del repositorio]. `docs/06-data-and-storage/privacy-and-local-data.md`.
