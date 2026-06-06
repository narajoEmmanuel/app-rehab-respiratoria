# Sesión de terapia

## Propósito

Ejecutar una sesión gamificada de ejercicios respiratorios (10 intentos en nivel 1): captura volumen **estimado** y tiempo sostenido vía sensor oficial o simulación táctil; valida intentos; persiste sesión e intentos.

## Archivos principales

| Rol | Ruta |
|-----|------|
| Ruta | `app/(tabs)/sesion.tsx` |
| Pantalla | `src/modules/session/screens/SessionScreen.tsx` |
| Motor | `src/modules/session/engine/level-one/use-level-one-game.ts` |
| Reglas | `src/modules/session/engine/level-one/level-one-repetition-rules.ts` |
| Touch | `src/modules/session/engine/touch/use-touch-input-adapter.ts` |
| UI juego | `src/modules/session/games/components/LevelOneGameView.tsx`, `level-runner-scene.tsx` |
| Intro | `src/modules/session/games/components/RunnerLevelPreStartIntro.tsx` |
| Sensor sesión | `src/modules/session/sensor/use-level-sensor-volume.ts` |
| Validación | `src/modules/session/sensor-evaluation/session-attempt-validation-service.ts` |
| Persistencia | `src/modules/session/session-progress-service.ts` |
| Storage | `src/modules/session/storage/session-progress-repository.ts` |
| Launch (decisión modo) | `src/modules/session/hooks/resolve-therapy-session-launch.ts` |
| Launch (orquestación) | `src/modules/session/hooks/use-therapy-session-launcher.ts` |

Tipografía: sesión activa y juego usan `Text` nativo con estilos locales (excepción Fase 4O; ver `typography-scale.md`). HUD compacto: «Volumen» / abreviaciones; modal de resumen: «Vol. máx. / prom. estimado».

## Rutas relacionadas

`/(tabs)/sesion?levelId&inputMode&sessionRunId` (tab oculta, barra tabs oculta en layout).

## Entradas del flujo

- Terapia o Inicio tras gates locales de cada pantalla; launch compartido en `useTherapySessionLauncher`.
- Params: `levelId`, `inputMode` (`sensor` | `touch_practice`), `sessionRunId` (`${levelId}-${Date.now()}`).

## Salidas del flujo

- `persistSessionResult` → `@rehab/sessions_v1`, `@rehab/attempts_v1`.
- Unlock nivel si sesión oficial perfecta acumula 6 (`checkAndUnlockNextLevel`).
- Navegación → `/(tabs)/resumen?sessionId=`.

## Datos persistidos

`SessionRecord`: compliance, volúmenes, `input_mode`, `is_practice_session`, trazabilidad calibración/sensor.  
`AttemptRecord`: hold, peak, validación sensor, `distance_mm`, etc.

## Relaciones

| Aspecto | Sensor oficial | Práctica táctil |
|---------|----------------|-----------------|
| `input_mode` | `sensor` | `touch_practice` |
| Validación | `sensor-evaluation/` | Simulación touch |
| Unlock niveles | Sí si perfecta | **No** |
| Volumen | Estimado desde modelo | Simulado — no equivalente clínico |

## Riesgos clínicos o técnicos

- **Crítico:** reglas de validación conservadora (`lowerBoundMl >= target`).
- Pantalla ~1600 líneas.
- No mezclar métricas touch con sensor en copy de resumen.

## Pendientes

- Refactor `SessionScreen`; prop legacy `showRunnerRabbit`.
- Niveles 2+ — gameplay según registry.

## Checklist manual mínimo

- [ ] Pre-start intro → 10 intentos → resumen.
- [ ] Sensor: intentos invalidados sin señal viva.
- [ ] Touch: `is_practice_session` true en storage.
- [ ] Sesión interrumpida — **requiere revisión manual** persistencia parcial.
- [ ] Tras sesión perfecta oficial: contador unlock incrementa.

## Docs relacionados

- [Terapia tab](../02-tabs/terapia.md)
- [Resumen sesión](./resumen-sesion.md)
- [Niveles progresión](./niveles-progresion.md)
- [Módulo session](../../src/modules/session/README.md)
