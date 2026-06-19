# Exportación de datos

## Contexto académico

La exportación permite al paciente generar un **paquete local** (JSON/CSV, formato clínico v2.4.0) para **revisión con un profesional de la salud**. Es **apoyo documental**, no un informe médico certificado, no un diagnóstico ni una prescripción.

Incluye sesiones con sensor (volúmenes **estimados**) y sesiones de práctica táctil **clasificadas** para no confundir métricas. RESPIRA+ es un **prototipo académico** en **pacientes adultos postoperatorios** (ITESM, 2026).

El módulo `clinician/` es **scaffold** sin dashboard terminado; la revisión profesional documentada pasa por este flujo de exportación e historial del paciente.

---

## Propósito

Permitir al paciente exportar un paquete clínico local (JSON/CSV) para revisión con profesional de la salud; export técnico de calibración CSV solo en modo técnico.

## Archivos principales

| Rol | Ruta |
|-----|------|
| Ruta | `app/data-export.tsx` |
| Pantalla | `src/modules/export/screens/DataExportScreen.tsx` |
| Agregado | `src/modules/export/services/clinical-export-service.ts` |
| Export paciente | `src/modules/export/services/patient-clinical-export-service.ts` |
| Sesiones | `src/modules/export/services/session-export-service.ts` |
| CSV clínico | `src/modules/export/formatters/clinical-csv-exporter.ts` |
| JSON clínico | `src/modules/export/formatters/clinical-json-exporter.ts` |
| CSV técnico cal | `src/modules/export/services/calibration-technical-export-service.ts` |
| Descarga | `src/modules/export/utils/download-export-file.ts` |
| Tipos | `src/modules/export/types/export-record.ts` |

Documentación del módulo: [export/README.md](../../src/modules/export/README.md).

## Rutas relacionadas

- `/data-export` — entrada desde card en **Inicio** (no Perfil).

## Entradas del flujo

- Usuario con consent activo y paciente cargado.

## Salidas del flujo

- Archivo compartido/descargado vía `expo-sharing` / `expo-file-system`.

## Datos persistidos

**No modifica** stores; lee paciente, diagnostics, levels, sessions, attempts, bloque calibración opcional.

Versión export: `CLINICAL_EXPORT_FORMAT_VERSION = '2.4.0'`, schema `1.0.0` (`clinical-export-service.ts`).

## Relaciones

| Aspecto | Detalle |
|---------|---------|
| Consent | `isConsentActive()` — pantalla bloquea export si inactivo |
| Paciente | Snapshot del paciente activo |
| Sensor/práctica | Incluye `input_mode`, `is_practice_session`, volúmenes estimados |
| Calibración técnica | CSV solo si `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION` |
| Cloud | Sin sync Supabase en build de referencia (local-first) |

## Riesgos clínicos o técnicos

- Copy: export para revisar con profesional — no informe certificado.
- Volúmenes son **estimados**; documentar en uso clínico externo.
- Datos sensibles locales — manejo seguro al compartir archivo.

## Pendientes

- ~~README módulo `export/` no existe.~~ → Ver [export/README.md](../../src/modules/export/README.md).
- Sincronizar docs CSV técnico con `docs/calibration/README-csv-tecnico-calibracion.md`.

## Checklist manual mínimo

- [ ] Sin consent: export deshabilitado o redirige legal.
- [ ] JSON y CSV generan archivo con versión 2.4.0.
- [ ] Incluye sesiones sensor y práctica clasificadas.
- [ ] CSV técnico cal solo visible con flag técnico.
- [ ] Share sheet funciona en iOS/Android (web — **requiere revisión manual**).

## Docs relacionados

- [Inicio](../02-tabs/inicio.md)
- [Export schema v2.4.0](../06-data-and-storage/export-schema-v2.4.0.md)
- [Datos y almacenamiento](../06-data-and-storage/README.md)
- [CSV técnico calibración](../05-calibration/csv-tecnico.md)
- [CSV diccionario](../calibration/README-csv-tecnico-calibracion.md)
- [Seguridad clínica](../08-clinical-safety/README.md)
- [Módulo export](../../src/modules/export/README.md) · [Módulo clinician](../../src/modules/clinician/README.md)

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Esquema de exportación clínica v2.4.0* [Documento interno del repositorio]. `docs/06-data-and-storage/export-schema-v2.4.0.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.
