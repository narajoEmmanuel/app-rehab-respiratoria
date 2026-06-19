# Módulo `levels` (Terapia — selección y progreso)

## Propósito

Presenta la pestaña **Terapia**: selección de niveles gamificados, estado de **progreso por nivel** y puente hacia la sesión activa. Los objetivos de volumen por nivel derivan del **VIM** (evaluación inicial); el volumen durante la sesión es **estimado** por sensor y calibración.

RESPIRA+ es un **prototipo académico** de apoyo en **pacientes adultos postoperatorios**. **No diagnostica** ni sustituye indicaciones del profesional de salud (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

```
Evaluación inicial (VIM) → patient_levels → LevelsScreen → compuertas → SessionScreen
```

| Compuerta | Origen |
|-----------|--------|
| Consentimiento | `ConsentTabGuard` |
| Evaluación | CTA si no hay `DiagnosticRecord` |
| Sensor readiness | `useTherapyReadinessGate` antes de sesión oficial |
| Práctica táctil | Alternativa documentada; no cuenta para unlock |

**Progresión:** tras **6 sesiones perfectas oficiales** con sensor en el nivel activo, se desbloquea el siguiente (`checkAndUnlockNextLevel`). Niveles 2+ pueden mostrarse como «próximamente» aunque la progresión lo permita.

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

Ver [Módulo diagnostics](../diagnostics/README.md).

---

## Sesión oficial vs práctica táctil

| Modo | Cuándo | Efecto en unlock |
|------|--------|------------------|
| **Sensor** | Readiness OK, consentimiento activo | Cuenta para desbloqueo y historial terapéutico |
| **Práctica táctil** | Flag + preferencia perfil + sin sensor real | `is_practice_session`; **no** equivale a sesión oficial |
| **Web / demo** | Sin hardware ESP32 | No sesión oficial con volumen medido |

La sesión activa (HUD/juego) vive en `session/` y conserva **`Text` nativo** por excepción visual (Fase 4O).

---

## Límites del módulo

- No ejecuta validación de intentos ni persistencia de sesión (delegado a `session/`).
- Gameplay completo documentado principalmente para nivel 1; niveles superiores en evolución.
- No modifica VIM ni targets clínicos fuera del flujo de re-evaluación en `diagnostics/`.

---

## Riesgos al modificar

| Riesgo | Impacto |
|--------|---------|
| Cambiar `TARGET_PERFECT_SESSIONS` sin alinear unlock | Niveles que no se desbloquean o se desbloquean antes de tiempo |
| Mezclar progreso de partida con `patient_levels` | UI incoherente con historial clínico |
| Omitir compuerta de sensor en lanzamiento | Sesiones oficiales sin volumen estimado válido |
| Contar práctica táctil en unlock | Progresión terapéutica inflada |

---

## Documentación canónica

- [Pestaña Terapia](../../../docs/02-tabs/terapia.md)
- [Niveles y progresión](../../../docs/03-features/niveles-progresion.md)
- [Evaluación inicial](../../../docs/03-features/evaluacion-inicial.md) · [Sesión](../../../src/modules/session/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Validación académica](../../../docs/09-academic-validation/README.md)
- Tipografía: [typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Niveles y progresión — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/niveles-progresion.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Evaluación inicial — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/evaluacion-inicial.md`.
