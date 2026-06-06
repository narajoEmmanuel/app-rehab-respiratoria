# Legacy — Perfil 5000 mL

## Propósito

Documentar rutas **históricas** del perfil 5000 mL (Besmed / validación geométrica). **No es el modelo principal** del flujo paciente RESPIRA+ 3000 mL postoperatorio.

## Archivos relacionados

| Rol | Ruta |
|-----|------|
| Perfil | `src/modules/device/spirometer/spirometer-profiles.ts` (`SPIROMETER_PROFILE_5000ML_ID`) |
| IDs legacy | `LEGACY_SPIROMETER_DEVICE_5000ML_ID`, `LEGACY_SPIROMETER_DEVICE_OTHER_ID` |
| Migración storage | `src/modules/device/spirometer/spirometer-storage.ts` |
| Opciones técnicas | `src/modules/device/spirometer/technical-spirometer-options.ts` |
| Migración cal | `src/modules/device/calibration/calibration-storage.ts` (`LEGACY_MIGRATION_FLAG_KEY`) |
| CSV legacy samples | `docs/calibration/legacy/` |
| Constantes deprecated | `src/modules/device/calibration/calibration-constants.ts` |

## Flujo funcional (solo contexto técnico)

- Con `EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true`, UI técnica puede seleccionar espirómetro 5000 mL.
- Marcas 0–5000 mL pasos 500 (`VOLUME_CHIPS_5000ML_TECHNICAL_ML`).
- Validación geométrica habilitada en perfil 5000 mL (`geometricValidationEnabled: true` en PROFILE_5000ML).
- Flujo paciente **no ofrece** 5000 mL ni «Otro espirómetro».

## Datos persistidos

Migración automática desde instalaciones antiguas hacia mapas `@respira_*` por spirometer device id.

## Relación con export

CSV técnico puede etiquetar capacidad `5000mL` vs `3000mL` según `nominalCapacityMl` (`calibration-technical-csv-exporter.ts`).

## Riesgos

- Reactivar 5000 mL en build paciente confundiría alcance clínico actual.
- Datos legacy en AsyncStorage — no borrar migraciones sin plan.

## Pendientes o revisión manual

- Cuándo eliminar migración legacy — decisión de producto pendiente.
- Samples CSV en `docs/calibration/legacy/` superseded por v20260602.

## Checklist manual mínimo

- [ ] Flujo paciente sin flag: solo 3000 mL predefinido.
- [ ] Migración desde perfil antiguo no corrompe modelo activo 3000 mL.
- [ ] Documentación EPOC/5000 no aparece en copy paciente.

## Docs relacionados

- [README calibración](./README.md)
- [Legacy CSV samples](../calibration/legacy/README.md)
