# Módulo `export` (exportación clínica local)

## Propósito

Permite al paciente generar un **paquete de datos locales** (JSON y CSV, formato clínico v2.4.0) para **revisión con un profesional de la salud**. La exportación es **apoyo documental**, no un informe médico certificado, no un diagnóstico ni una prescripción.

Incluye, cuando aplica, export técnico de calibración CSV solo en modo técnico (`EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION`).

RESPIRA+ es un **prototipo académico** en contexto **postoperatorio**; los volúmenes exportados son **estimaciones** del modelo de sensor (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

| Origen | Uso |
|--------|-----|
| Inicio (`HomeExportCard`) | Acceso principal desde `/data-export` |
| Historial (`HistoryExportCard`) | Atajo con mismos requisitos de consentimiento |

El módulo **lee** stores locales (`patient`, `diagnostics`, `sessions`, `attempts`, calibración opcional) y **no modifica** persistencia. Sustituye la necesidad de un dashboard clínico terminado: el profesional revisa el archivo compartido fuera de la app.

**Modo local con sensor:** export incluye sesiones con `input_mode: sensor`, metadatos de calibración y volúmenes estimados.

**Práctica táctil / web:** registros clasificados como `touch_practice` / `is_practice_session`; deben interpretarse como simulación, no métrica clínica oficial.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Pantalla | `screens/DataExportScreen.tsx` ← `app/data-export.tsx` |
| Agregado | `services/clinical-export-service.ts` |
| Export paciente | `services/patient-clinical-export-service.ts` |
| Sesiones | `services/session-export-service.ts` |
| CSV clínico | `formatters/clinical-csv-exporter.ts` |
| JSON clínico | `formatters/clinical-json-exporter.ts` |
| CSV técnico cal | `services/calibration-technical-export-service.ts` |
| Descarga | `utils/download-export-file.ts` |
| Tipos | `types/export-record.ts` |

Versión export: `CLINICAL_EXPORT_FORMAT_VERSION = '2.4.0'`, schema `1.0.0`.

---

## Requisitos y relaciones

| Aspecto | Detalle |
|---------|---------|
| Consentimiento | `isConsentActive()` — pantalla bloquea export si inactivo |
| Paciente | Snapshot del paciente activo vía `patient/` |
| Clasificación | `input_mode`, `is_practice_session`, volúmenes estimados |
| Privacidad | Datos sensibles en dispositivo; manejo seguro al compartir archivo |

---

## Límites del módulo

- No certifica resultados ni garantiza exactitud clínica.
- No sincroniza con Supabase ni backend hospitalario (cloud congelado por defecto).
- Share sheet en web — **requiere revisión manual** (checklist en feature doc).
- CSV técnico de calibración es para trazabilidad de banco, no para el paciente estándar.

---

## Documentación canónica

- [Exportación de datos (feature)](../../../docs/03-features/exportacion-datos.md)
- [Export schema v2.4.0](../../../docs/06-data-and-storage/export-schema-v2.4.0.md)
- [Datos y almacenamiento](../../../docs/06-data-and-storage/README.md) · [Privacidad](../../../docs/06-data-and-storage/privacy-and-local-data.md)
- [Calibración](../../../docs/05-calibration/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Módulo clinician](../clinician/README.md) (scaffold; no reemplaza export)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Exportación de datos — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/exportacion-datos.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Esquema de exportación clínica v2.4.0* [Documento interno del repositorio]. `docs/06-data-and-storage/export-schema-v2.4.0.md`.
