# Exportación de datos

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

## Riesgos clínicos o técnicos

- Copy: export para revisar con profesional — no informe certificado.
- Volúmenes son **estimados**; documentar en uso clínico externo.
- Datos sensibles locales — manejo seguro al compartir archivo.

## Pendientes

- README módulo `export/` no existe.
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
