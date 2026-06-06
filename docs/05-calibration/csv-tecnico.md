# CSV técnico de calibración

## Propósito

Documentar export CSV metrológico de calibración (schema **2.4.0**), separado del export clínico de paciente.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Export service | `src/modules/export/services/calibration-technical-export-service.ts` |
| Formatter | `src/modules/export/formatters/calibration-technical-csv-exporter.ts` |
| Constante schema | `CALIBRATION_EXPORT_SCHEMA_VERSION = '2.4.0'` |
| UI export | `src/modules/export/screens/DataExportScreen.tsx` (sección técnica si flag) |
| Diccionario APA | [../calibration/README-csv-tecnico-calibracion.md](../calibration/README-csv-tecnico-calibracion.md) |

## Flujo funcional

1. `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true`.
2. Usuario exporta desde `/data-export` o flujo resumen técnico.
3. Servicio agrega puntos, modelos, métricas, identificación dispositivo.
4. CSV compartido vía `download-export-file.ts`.

## Datos incluidos

~146 columnas documentadas en diccionario legacy (puntos por volumen, coeficientes, U95, cobertura, repetibilidad, identificación Besmed/RESPIRA+, etc.).

Relacionado con modelo activo y perfil espirómetro, no con presión inspiratoria.

## Datos persistidos

Lee de `@respira_device_calibration_profiles_by_spirometer_v1` y modelos activos; no escribe storage al exportar.

## Riesgos

- CSV contiene datos técnicos sensibles de validación — manejo seguro al compartir.
- Desalineación diccionario vs código — revisar versión 2.4.0 en ambos.

## Pendientes o revisión manual

- Mantener sincronizado con `docs/calibration/README-csv-tecnico-calibracion.md` (fuente detallada).

## Checklist manual mínimo

- [ ] Export CSV con flag técnico ON.
- [ ] Header/schema indica 2.4.0.
- [ ] Puntos predefinidos 3000 mL reflejados si modelo activo es predefinido.

## Docs relacionados

- [Flujo técnico](./technical-flow.md)
- [Export schema clínico](../06-data-and-storage/export-schema-v2.4.0.md)
