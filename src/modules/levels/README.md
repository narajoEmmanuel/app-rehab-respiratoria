# Módulo `levels` (Terapia — selección y progreso)

UI de la pestaña **Terapia** y estado de **progreso por nivel** en memoria + AsyncStorage. RESPIRA+ **no diagnostica**; los targets por nivel derivan del VIM (referencia personal) y el volumen en sesión es **estimado** por sensor y calibración.

---

## Propósito

- Pantalla de selección de niveles (`LevelsScreen`).
- Contexto React `LevelsProgressProvider` para partidas en curso (nivel 1 y runner levels).
- Persistencia de punteros de sesión/repetición por paciente.
- Puente hacia `SessionScreen` tras compuertas de sensor, evaluación y consentimiento.

---

## Archivos principales

| Rol | Archivo |
|-----|---------|
| Pantalla Terapia | `screens/LevelsScreen.tsx` |
| Contexto progreso | `state/levels-progress-context.tsx` |
| Hook | `state/use-levels-progress.ts` |
| Storage progreso | `storage/levels-progress-storage.ts` |
| Marca partida activa | `storage/level-one-active-run-storage.ts` |
| Tipos | `types/level-progress.ts`, `types/runner-levels.ts` |

**Ruta:** `app/(tabs)/terapia.tsx` → `LevelsScreen` (con `ConsentTabGuard`).

**UI compartida:** `TherapyLevelCard` vive en `src/shared/ui/therapy-level-card.tsx` (no en este módulo).

---

## LevelsScreen

- Lista niveles del registry (`session/registry/level-registry.ts`).
- Muestra filas de `patient_levels` (estado `active` / `locked` / `completed`).
- CTA de evaluación inicial si no hay diagnóstico.
- Lanzamiento de sesión vía `useTherapySessionLauncher` (Fase 5B): readiness sensor, práctica táctil, navegación a `/(tabs)/sesion`.
- `useTherapyReadinessGate().refresh` en focus para actualizar compuerta antes de jugar.
- Card informativa de desbloqueo: **6 sesiones perfectas** en el nivel activo.

---

## TherapyLevelCard

Componente shared usado por `LevelsScreen` para cada nivel: título, chip de estado (`locked`, `recommended`, `in_progress`, `completed`, `available`), copy motivacional y botón jugar.

Tipografía: `AppText` (Fase 4G).

---

## Progresión y desbloqueo

| Concepto | Valor / regla |
|----------|----------------|
| Sesiones perfectas para unlock | `TARGET_PERFECT_SESSIONS = 6` (`session/session-progress-service.ts`) |
| Desbloqueo | `checkAndUnlockNextLevel()` tras guardar sesión **oficial** con sensor |
| Progreso en UI | `perfect_sessions_completed` en `patient_levels` + stats lifetime/today |
| Niveles «coming soon» | Bloqueados en UI aunque la progresión lo permita |

Progreso de partida (slot actual, reps): `rehab.levels.progress.v1.u{patientId}`.

---

## Relación con evaluación inicial

Sin `DiagnosticRecord` / `patient_levels`, Terapia muestra CTA hacia evaluación (`navigateToInitialEvaluation`). Los targets de volumen por nivel se calculan desde el VIM en `diagnostics/diagnostic-service.ts`.

---

## Sesión oficial vs práctica táctil

| Modo | Cuándo | Efecto en unlock |
|------|--------|------------------|
| **Sensor** | Readiness OK, consentimiento activo | Cuenta para desbloqueo y historial terapéutico |
| **Práctica táctil** | Flag + preferencia perfil + sin sensor real | `is_practice_session`; **no** equivale a sesión oficial |

La sesión activa (HUD/juego) vive en `session/` y conserva **`Text` nativo** por excepción visual (Fase 4O).

---

## Riesgos al modificar

| Riesgo | Impacto |
|--------|---------|
| Cambiar `TARGET_PERFECT_SESSIONS` sin alinear unlock | Niveles que no se desbloquean o se desbloquean antes de tiempo |
| Mezclar progreso de partida con `patient_levels` | UI incoherente con historial clínico |
| Omitir compuerta de sensor en lanzamiento | Sesiones oficiales sin volumen estimado válido |
| Contar práctica táctil en unlock | Progresión terapéutica inflada |

---

## Referencias

- [Pestaña Terapia](../../../docs/02-tabs/terapia.md)
- [Niveles y progresión](../../../docs/03-features/niveles-progresion.md)
- [Sesión y HUD](../../../src/modules/session/README.md)
- [Evaluación inicial](../../../docs/03-features/evaluacion-inicial.md)
- Tipografía: [typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md)
