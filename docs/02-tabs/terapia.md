# Terapia

## Propósito

Selección de niveles de ejercicio respiratorio gamificado, visualización de progreso hacia desbloqueo y lanzamiento de sesión con sensor oficial o práctica táctil.

## Archivos relacionados

| Tipo | Ruta |
|------|------|
| Ruta | `app/(tabs)/terapia.tsx` (wrapper + `ConsentTabGuard`) |
| Pantalla | `src/modules/levels/screens/LevelsScreen.tsx` |
| Guard | `src/modules/legal/ConsentTabGuard.tsx` |
| UI nivel | `src/shared/ui/therapy-level-card.tsx` |
| Registro niveles | `src/modules/session/registry/level-registry.ts` |
| Progreso | `src/modules/levels/state/levels-progress-context.tsx` |
| Unlock | `src/modules/session/session-progress-service.ts` |

Tipografía: `LevelsScreen` + `TherapyLevelCard` migrados a `AppText` (Fase 4G). `therapy-level-card.tsx` (shared) aún con estilos inline — pendiente.

## Flujo funcional

1. Sin evaluación → CTA `/diagnostico` (`navigateToInitialEvaluation`).
2. Con evaluación → cards desde `@rehab/patient_levels_v1` (`getPatientLevels`).
3. Tap nivel → `resolveTherapySessionLaunchInputMode` → readiness sensor o touch.
4. Navega a `/(tabs)/sesion?levelId&inputMode&sessionRunId`.
5. UI muestra progreso: sesiones perfectas / `TARGET_PERFECT_SESSIONS` (6) hacia unlock.

## Datos y persistencia

| Lee | Escribe |
|-----|---------|
| `patient_levels`, diagnostics, sessions | Progreso in-run vía `LevelsProgressProvider` |
| Registry `listLevels()` | Unlock vía `session-progress-service` (post-sesión oficial) |

Sesión **touch_practice** no cuenta para desbloqueo (`persistSessionResult` retorna `NO_UNLOCK`).

## Dependencias y gates

| Gate | Requerido |
|------|-----------|
| Consent activo | Sí (tab + guard) |
| Evaluación inicial | Sí para jugar |
| Sensor + calibración | Sesión oficial |
| Touch practice | Flag + pref + sin transporte sensor |

Hooks: `usePatientSession`, `useLevelsProgress`, `useSensorConnection`, `useTherapyReadinessGate`, `useTouchPracticeGate`, `useTouchPracticePreference`.

Copy de seguridad: detener ante dolor, mareo, disnea (`LevelsScreen.tsx`).

## Riesgos al modificar

- **Crítico:** reglas de unlock (6 perfectas sensor en nivel activo).
- **Alto:** duplicación launch con `HomeScreen`; `DEV_UNLOCK_ALL_LEVELS` solo UI.
- **Medio:** `comingSoon` en tipos vs registry vacío.

## Pendientes o revisión manual

- Extraer launch compartido con Inicio.
- Niveles 2–6: registry existe; gameplay parcial según `session/README.md`.

## Checklist manual mínimo

- [ ] Sin evaluación: solo CTA diagnóstico.
- [ ] Con evaluación: level-1 activo, resto locked/completed según progreso.
- [ ] Consent retirado: tab bloqueado al pulsar.
- [ ] Sesión sensor: readiness OK antes de abrir sesión.
- [ ] Sesión touch: etiquetada práctica; no unlock tras 6 sesiones touch.
- [ ] Mensaje de síntomas visible en pantalla.

## Docs relacionados

- [Sesión de terapia](../03-features/sesion-terapia.md)
- [Niveles y progresión](../03-features/niveles-progresion.md)
- [Evaluación inicial](../03-features/evaluacion-inicial.md)
- [Módulo session](../../src/modules/session/README.md)
