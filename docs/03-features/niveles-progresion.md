# Niveles y progresión

## Propósito

Definir niveles de dificultad terapéutica, objetivos de volumen personalizados, estado locked/active/completed y reglas de desbloqueo progresivo.

## Archivos principales

| Rol | Ruta |
|-----|------|
| Registro | `src/modules/session/registry/level-registry.ts` |
| Gameplay config | `src/modules/session/levels/level-gameplay-config.ts`, `level-difficulty-config.ts` |
| Targets seguridad | `src/modules/session/levels/level-target-safety.ts` |
| Generación niveles | `src/modules/diagnostics/diagnostic-service.ts` (`generatePatientLevels`) |
| Unlock | `src/modules/session/session-progress-service.ts` (`checkAndUnlockNextLevel`, `TARGET_PERFECT_SESSIONS = 6`) |
| Diagnóstico unlock | `src/modules/session/level-unlock-diagnostics.ts` |
| UI progreso | `src/modules/levels/screens/LevelsScreen.tsx` |
| Storage progreso | `src/modules/levels/storage/levels-progress-storage.ts`, `level-one-active-run-storage.ts` |
| Dev flag | `src/config/dev-level-flags.ts` (`DEV_UNLOCK_ALL_LEVELS`) |

## Rutas relacionadas

- `/(tabs)/terapia` — selección
- Evaluación inicial crea filas en `@rehab/patient_levels_v1`

## Entradas del flujo

- Post evaluación: level-1 `active`, demás `locked`.
- Tras 6 sesiones **perfectas** oficiales (sensor, no práctica) en nivel activo → siguiente nivel `active`.

## Salidas del flujo

- Actualización `patient_levels` y `current_level_id` en paciente.
- Modal celebración unlock (`LevelAdvanceCelebrationModal.tsx`).

## Datos persistidos

| Store | Contenido |
|-------|-----------|
| `@rehab/patient_levels_v1` | `level_status`, `target_volume`, `perfect_sessions_completed` |
| `rehab.levels.progress.v1.u{id}` | Progreso in-run |
| `@rehab/sessions_v1` | Fuente para conteo perfectas (`isTherapeuticSessionRecord`) |

Targets = VIM × factores (50%–100%) definidos en diagnostic-service.

## Relaciones

| Aspecto | Detalle |
|---------|---------|
| Evaluación | Requerida para generar targets |
| Sensor | Solo sesiones `input_mode=sensor` y no práctica cuentan unlock |
| Touch | Excluido de `isTherapeuticSessionRecord` |
| Consent | Indirecto vía Terapia |

## Riesgos clínicos o técnicos

- Alterar `TARGET_PERFECT_SESSIONS` impacta adherencia clínica percibida.
- `DEV_UNLOCK_ALL_LEVELS` solo UI — no altera DB progresión.

## Pendientes

- `comingSoon` en tipos sin levels en registry.
- Niveles 2–6 gameplay incompleto.

## Checklist manual mínimo

- [ ] Tras evaluación: solo level-1 jugable.
- [ ] 6 perfectas sensor en level-1: level-2 pasa a active.
- [ ] 6 sesiones touch perfectas: **no** unlock.
- [ ] Targets coherentes con VIM del diagnóstico.

## Docs relacionados

- [Terapia](../02-tabs/terapia.md)
- [Evaluación inicial](./evaluacion-inicial.md)
- [Sesión terapia](./sesion-terapia.md)
