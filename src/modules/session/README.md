# Módulo `session` (terapia y sesión)

## Propósito

Orquesta la **sesión guiada de terapia gamificada**, el motor del nivel 1, la **validación de intentos** (sensor oficial o práctica táctil), los **descansos entre repeticiones** y la **persistencia local** de sesiones e intentos. En el flujo con sensor, cada intento evalúa volumen **estimado** y tiempo sostenido frente a la meta derivada del VIM.

RESPIRA+ es un **prototipo académico** de apoyo en **pacientes adultos postoperatorios**; no diagnostica, no prescribe ni certifica eficacia clínica (ITESM, 2026).

---

## Relación con el flujo clínico y funcional

| Modo | Activación | Persistencia | Rol clínico |
|------|------------|--------------|-------------|
| **Sensor (oficial)** | Terapia tras compuerta OK | `input_mode: sensor`, `data_source: sensor_model` | Cuenta para unlock, historial terapéutico y export |
| **Práctica táctil** | `EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE=true` + alerta | `touch_practice`, `is_practice_session: true` | Entrenamiento UI; **no** equivalente a sesión medida |
| **Web / demo** | Sin ESP32 | Igual que táctil o sin sesión oficial | No pipeline VL53L0X |

La validación conservadora con sensor exige, entre otros criterios, **`lowerBoundMl >= target`** y tiempo sostenido configurado en el motor del nivel. Nivel 1: **10 intentos** con fases de inspiración, sostén y descanso; pausa permite guardar e interrumpir.

Flujo posterior: `persistSessionResult` → resumen (`summary/`) → historial (`history/`) → export opcional (`export/`).

---

## Carpetas

| Carpeta | Rol |
|---------|-----|
| `screens/` | `SessionScreen` — orquestación de sesión por nivel |
| `components/` | UI presentacional externa al juego (Fase 5D) |
| `engine/` | `use-level-one-game`, `use-touch-input-adapter` |
| `games/` | UI del minijuego (`LevelOneGameView`, hints de volumen) |
| `sensor-evaluation/` | Evaluación y validación oficial de intentos con sensor |
| `storage/` | Repositorio AsyncStorage de sesiones e intentos |
| `types/` | `SessionRecord`, `AttemptRecord`, resultados |
| `registry/` | Catálogo de niveles |
| `levels/` | Dificultad y metadatos por nivel |
| `utils/` | Estadísticas del día, agregados ligeros |

Archivos transversales:

- `session-input-mode.ts` — `sensor` vs `touch_practice` y flag de entorno.
- `session-record-classification.ts` — etiquetas Sensor / Práctica / Sin clasificar e campos de exportación.
- `hooks/resolve-therapy-session-launch.ts` — decisión sensor vs práctica táctil.
- `hooks/use-therapy-session-launcher.ts` — lanzamiento compartido desde Inicio y Terapia (Fase 5B).

---

## Lanzamiento de sesión (Fase 5B)

`useTherapySessionLauncher` centraliza la lógica duplicada entre `HomeScreen` y `LevelsScreen`:

| Responsabilidad | Hook | Pantallas |
|-----------------|------|-----------|
| Resolver `inputMode` (`resolveTherapySessionLaunchInputMode`) | Sí | — |
| Navegar a `/(tabs)/sesion` con `levelId`, `sessionRunId`, `inputMode` | Sí | — |
| Readiness sensor (`evaluateLevelSensorReadiness`, alerts) | Sí | — |
| Práctica táctil vs sesión oficial | Sí | — |
| Estado `launchingLevelId` durante async readiness | Sí | — |
| Gates consentimiento / evaluación | No | `HomeScreen` |
| Fallback a tab Terapia si no hay nivel activo | No | `HomeScreen` |
| Bloqueo progresión (`locked`, `comingSoon`) | No | `LevelsScreen` |
| UI de niveles y cards | No | `LevelsScreen` |

API expuesta: `launchTherapySession(levelId)`, `launchingLevelId`, `navigateToSession`, `beginOfficialSensorSession`.

---

## Reglas

1. **No** abrir WebSocket desde session; usar `useActiveVolumeEstimate` y `useSensorConnection` (`device/`).
2. **No** mezclar métricas de práctica táctil con sesiones medidas por sensor en informes clínicos.
3. Sesiones **sin clasificar** son compatibilidad con registros antiguos (sin `input_mode`).
4. Unlock de siguiente nivel: **6 sesiones perfectas oficiales** con sensor (`checkAndUnlockNextLevel`).

---

## Rutas

- `app/(tabs)/sesion.tsx` → `SessionScreen`
- `app/(tabs)/resumen.tsx` → resumen post-sesión
- Parámetros: `levelId`, `sessionRunId`, `inputMode`

---

## AsyncStorage relevante (Nivel 1)

| Clave | Contenido | ¿Historial oficial? |
|-------|-----------|---------------------|
| `rehab.levels.progress.v1.u{patientId}` | Progreso de niveles: sesión/rep actual, válidas/fallidas por slot, `interrupted` | Progreso terapéutico del nivel (no borrar al limpiar partida) |
| `rehab.levels.level_one_active_run.v1.u{patientId}` | Marca efímera: `sessionRunId`, `levelId`, `inputMode` | No — se borra al salir limpio; si queda tras cierre abrupto, al abrir la app se descarta el slot a medias |
| `@rehab/sessions_v1` / `@rehab/attempts_v1` | Historial de sesiones e intentos guardados | Sí — no se tocan al reiniciar partida |

**No se persiste en disco:** `phase`, countdown, `holdMs` del motor (solo memoria; se reinicia con `engineScopeKey` y `stopSession`).

**Limpieza de partida en curso:** `prepareFreshLevelOneSessionRun` / `discardInProgressLevelOneRun` (slot actual a cero). Al reentrar con nuevo `sessionRunId`, al abandonar sin marcar slot interrumpido, o al reabrir la app si quedó `level_one_active_run`.

---

## SessionScreen — orquestación (Fase 5D)

`SessionScreen` conserva motor, sensor, persistencia, pausa y navegación. Los componentes en `components/` son **UI externa al juego** — también usan `Text` nativo (no `AppText`), alineado con modales de sesión.

| Componente | Renderiza | Props principales |
|------------|-----------|-------------------|
| `SessionLoadingState` | Carga / readiness | `showSensorHint` |
| `SessionErrorState` | Nivel no encontrado / próximamente | `title`, `detail` |
| `SessionSavingOverlay` | Guardando sesión interrumpida | — |
| `SessionGoalAdjustmentNotice` | Banner meta ajustada | `message` |
| `SessionPauseModal` | Pausa | `visible`, `onContinue`, `onSaveAndExit` |
| `SessionSummaryModal` | Resumen previo a `/resumen` | métricas, `savingSummary`, callbacks |

**No extraído (Fase 5D):** `LevelOneGameView`, `RunnerLevelPreStartIntro`, celebraciones en `games/`, motor, sensor, HUD.

### Lógica que permanece en SessionScreen

- Params `levelId`, `sessionRunId`, `inputMode`; hooks sensor y juego.
- `useLevelOneGame`, `useTouchInputAdapter`, `useLevelSensorVolume`.
- Pausa, cancelación, `persistSessionResult`, `buildSessionResult`, navegación a resumen.
- Readiness de entrada, carga de nivel activo, trazas de calibración.

---

## Tipografía (excepción HUD)

Sesión activa y componentes de juego (`LevelOneGameView`, `RunnerGameFeedbackBar`, intro, coach, celebraciones) usan **`Text` nativo** con estilos locales — no `AppText`. Motivo: pesos 800/900 del HUD y celdas compactas; migración Fase 4O revertida por regresión visual. Los componentes Fase 5D en `components/` **también** conservan `Text` nativo. Detalle: [docs/07-ui-design-system/typography-scale.md](../../../docs/07-ui-design-system/typography-scale.md).

Copy volumen en HUD: «Volumen» / abreviaciones; en modal de resumen de sesión: «Vol. máx. / prom. estimado».

---

## Límites del módulo

- Niveles 2–5 en catálogo con bloqueo progresivo (`comingSoon` / diagnóstico); gameplay completo solo nivel 1.
- No implementa exportación ni dashboard clínico (ver `export/`, `clinician/`).
- Sesión interrumpida — persistencia parcial requiere revisión manual (checklist en feature doc).

---

## Estado

Nivel 1 con juego visual y validación por sensor implementados. Niveles 2–5 en catálogo con bloqueo progresivo (`comingSoon` / diagnóstico).

---

## Documentación canónica

- [Sesión de terapia (feature)](../../../docs/03-features/sesion-terapia.md)
- [Niveles y progresión](../../../docs/03-features/niveles-progresion.md) · [Módulo levels](../levels/README.md)
- [Dispositivo](../device/README.md) · [Resumen](../summary/README.md) · [Historial](../history/README.md)
- [Seguridad clínica](../../../docs/08-clinical-safety/README.md)
- [Validación académica](../../../docs/09-academic-validation/README.md)
- [QA](../../../docs/10-testing-and-validation/README.md)

---

## Referencias

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Sesión de terapia — RESPIRA+* [Documento interno del repositorio]. `docs/03-features/sesion-terapia.md`.

Instituto Tecnológico y de Estudios Superiores de Monterrey. (2026). *Seguridad clínica y lenguaje — RESPIRA+* [Documento interno del repositorio]. `docs/08-clinical-safety/README.md`.
